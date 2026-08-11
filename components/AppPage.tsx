"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Anchor, ArrowLeft, ArrowRight, Banknote, CalendarDays, Check, ChevronRight, CircleHelp, CreditCard, Download, Edit3, FileDown, FileText, Gauge, Landmark, LockKeyhole, MapPin, PackageOpen, Plus, Search, Settings, Ship, SlidersHorizontal, Sparkles, Trash2, Upload, UserRound, WalletCards } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/components/RequireAuth";
import RoleGuard from "@/components/RoleGuard";
import { CapacityProgress, ConfirmationModal, EmptyState, InfoTooltip, MetricCard, Modal, PageHeader, StatusBadge, Toast } from "@/components/common/ui";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, fileUrl } from "@/lib/api";
import { mapOrderToPayment, mapShipment } from "@/lib/adapters";
import type { ApiShipment } from "@/lib/api-types";
import { findMatches, useContainer, useContainers, useDocumentSchema, useDocuments, useDocumentTypes, useOrders, useShipment, useShipments, useVessels } from "@/lib/hooks";
import type { ContainerMatch, CostBreakdown as CostBreakdownType, ExportDocument, Payment, Shipment, UserTask, VesselIdentity } from "@/types";
import { formatDate, formatRelativeTime, formatRupiah } from "@/utils/format";

export type PageKind = "dashboard"|"shipments"|"shipment-detail"|"matching"|"match-detail"|"documents"|"document-new"|"document-field"|"payments"|"checkout"|"support"|"settings";
const shipmentLabels: Record<string,string>={"Draft":"Draft","Awaiting Match":"Menunggu Match","Matched":"Matched","Documents Incomplete":"Dokumen Belum Lengkap","Awaiting Verification":"Menunggu Verifikasi","Awaiting Booking":"Menunggu Booking","Booked":"Booked","Cargo Ready":"Cargo Ready","Cargo Received":"Kargo Diterima","In Transit":"Dalam Perjalanan","Customs Processing":"Proses Bea Cukai","Delivered":"Terkirim","Cancelled":"Dibatalkan"};
const docLabels:Record<string,string>={"draft":"Draft","generated":"Dibuat"};

type DocumentProcessingStatus="uploaded"|"queued"|"parsing"|"ocr_processing"|"classifying"|"extracting"|"completed"|"needs_review"|"failed";
interface DocumentProcessingResult{documentId:string;fileName:string|null;inspectionStatus:string|null;processingStatus:DocumentProcessingStatus|null;pages:number|null;hasTextLayer:boolean|null;classification:{type:string|null;confidence:number|null;method:string|null};error:string|null;}
interface DocumentExtraction{id:string;field:string;value:string;unit:string|null;confidence:number;isCorrected:boolean;source:{page:number|null;text:string|null;extractionMethod:string;parser:string;};}
const terminalDocumentStatuses=new Set<DocumentProcessingStatus>(["completed","needs_review","failed"]);
const processingLabels:Record<DocumentProcessingStatus,string>={uploaded:"File diterima",queued:"Menunggu antrean",parsing:"Membaca dokumen",ocr_processing:"Menjalankan OCR",classifying:"Mengklasifikasikan",extracting:"Mengekstrak field",completed:"Selesai",needs_review:"Perlu ditinjau",failed:"Gagal"};

function PageLoading(){return <p className="page-subtitle" style={{padding:"24px 0"}}>Memuat data...</p>}
function ErrorNote({message}:{message:string}){return <div className="card"><p className="field-error">{message}</p></div>}
function pickShipment(shipments:Shipment[]):Shipment|undefined{return shipments.find(s=>s.status==="Draft"||s.status==="Awaiting Match")??shipments[0]}

export function ShipmentTable({items}:{items:Shipment[]}){return <><div className="table-wrap"><table className="data-table"><thead><tr><th>ID Pengiriman</th><th>Tujuan</th><th>Cargo Ready Date</th><th>CBM</th><th>Produk</th><th>Status pengiriman</th><th>Tindakan berikutnya</th></tr></thead><tbody>{items.map(s=><tr key={s.id}><td><Link href={`/shipments/${s.id}`}>{s.id}</Link></td><td>{s.destinationPort}, {s.destinationCountry}</td><td>{formatDate(s.cargoReadyDate)}</td><td>{s.cbm} CBM</td><td>{s.product.category}</td><td><StatusBadge status={shipmentLabels[s.status]??s.status}/></td><td><Link href={`/shipments/${s.id}`} style={{display:"flex",alignItems:"center",gap:5}}>{s.nextAction}<ChevronRight size={14}/></Link></td></tr>)}</tbody></table></div><div className="mobile-cards">{items.map(s=><ShipmentCard shipment={s} key={s.id}/>)}</div></>}
export function ShipmentCard({shipment:s}:{shipment:Shipment}){return <Link href={`/shipments/${s.id}`} className="shipment-mobile" style={{textDecoration:"none",color:"inherit"}}><div className="shipment-mobile-top"><strong style={{color:"var(--navy-950)"}}>{s.id}</strong><StatusBadge status={shipmentLabels[s.status]??s.status}/></div><dl><div><dt>Tujuan</dt><dd>{s.destinationPort}</dd></div><div><dt>Cargo Ready Date</dt><dd>{formatDate(s.cargoReadyDate)}</dd></div><div><dt>Volume</dt><dd>{s.cbm} CBM</dd></div><div><dt>Pembayaran</dt><dd>{s.paymentStatus}</dd></div></dl><p style={{fontSize:11,color:"var(--muted)",marginTop:12}}>Berikutnya: <strong>{s.nextAction}</strong></p></Link>}
export function TaskList({tasks}:{tasks:UserTask[]}){return <div>{tasks.map(task=><Link href={task.href} className="task" key={task.id} style={{textDecoration:"none",color:"inherit"}}><span className="task-icon"><AlertCircle size={17}/></span><span><h3>{task.title}</h3><p>{task.description}</p></span><span className="task-time">{task.dueLabel}</span></Link>)}</div>}
export function DocumentStatusCard({document}:{document:ExportDocument}){return <div className="doc-card"><span className="doc-icon"><FileText size={18}/></span><div><h3>{document.typeLabel}</h3><small style={{color:"var(--muted)"}}>Diperbarui {formatDate(document.updatedAt)}</small></div><StatusBadge status={docLabels[document.status]??document.status}/></div>}
export function DocumentChecklist({documents}:{documents:ExportDocument[]}){return <div className="grid">{documents.map(doc=><DocumentStatusCard document={doc} key={doc.id}/>)}</div>}
export function ContainerMatchCard({match,compact=false}:{match:ContainerMatch;compact?:boolean}){return <article className="card match-card"><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"start"}}><div><div className="eyebrow">{match.shipmentType}{match.vessel?.name?` • ${match.vessel.name}`:""}</div><div className="route" style={{marginTop:8}}><span>{match.originPort.split(",")[0]}</span><span className="route-line"/><span>{match.destinationPort}</span></div></div><StatusBadge status={match.status}/></div><CapacityProgress occupancy={match.occupancy}/>{match.vessel?.fullnessPercent!=null&&<CapacityProgress occupancy={match.vessel.fullnessPercent} label="Estimasi muatan kapal"/>}<div className="meta-grid"><Meta label="Estimasi berangkat" value={formatDate(match.estimatedDeparture)}/><Meta label="Sisa kapasitas" value={`${match.remainingCbm} CBM`}/><Meta label="Cargo cut-off" value={formatDate(match.cargoCutoff)}/><Meta label="UMKM bergabung" value={`${match.participants} usaha`}/>{!compact&&<><Meta label="Document cut-off" value={formatDate(match.documentCutoff)}/><Meta label="Transit" value={match.transitDays!=null?`${match.transitDays} hari`:"Belum tiba"}/></>}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:12}}><div><div className="meta-label">Estimasi total pembayaran</div><strong style={{color:"var(--navy-950)",fontSize:17}}>{formatRupiah(match.costs.total)}</strong></div><Link className="btn btn-secondary" href={`/matching/${match.id}`}>Lihat detail <ArrowRight size={14}/></Link></div></article>}
function Meta({label,value}:{label:string;value:string}){return <div><div className="meta-label">{label}</div><div className="meta-value">{value}</div></div>}
export function CostBreakdown({costs,cbm=5}:{costs:CostBreakdownType;cbm?:number}){return <div><CostRow label="Estimasi freight" note={`${cbm} CBM × ${formatRupiah(Math.round(costs.freight/cbm))}`} value={costs.freight}/><CostRow label="Biaya platform KUBO" note={`${cbm} CBM × ${formatRupiah(Math.round(costs.platformFee/cbm))}`} value={costs.platformFee}/><CostRow label="Bantuan dokumen" value={costs.documentAssistance}/><CostRow label="Handling" value={costs.handling}/><CostRow label="Asuransi" value={costs.insurance}/><CostRow label="Pajak / biaya tambahan" value={costs.taxes}/><CostRow label="Langganan" value={costs.subscription}/><div className="cost-row total"><span>Total jatuh tempo</span><span>{formatRupiah(costs.total)}</span></div></div>}
function CostRow({label,value,note}:{label:string;value:number;note?:string}){return <div className="cost-row"><span>{label}{note&&<span className="cost-note">{note}</span>}</span><strong>{formatRupiah(value)}</strong></div>}
export function PaymentMethodCard({id,label,detail,selected,onSelect,icon:Icon}:{id:string;label:string;detail:string;selected:boolean;onSelect:(id:string)=>void;icon:typeof CreditCard}){return <label className={`payment-method ${selected?"selected":""}`}><input type="radio" name="payment" checked={selected} onChange={()=>onSelect(id)}/><Icon size={22} color="var(--navy-950)"/><span><strong style={{display:"block",fontSize:13}}>{label}</strong><small style={{color:"var(--muted)"}}>{detail}</small></span></label>}

function buildTasks(shipments:Shipment[]):UserTask[]{
  const tasks:UserTask[]=[];
  for(const s of shipments){
    if(s.status==="Documents Incomplete") tasks.push({id:`doc-${s.id}`,title:`Perbaiki dokumen ${s.id}`,description:`${s.nextAction} untuk ${s.destinationPort}, ${s.destinationCountry}.`,dueLabel:formatDate(s.cargoReadyDate),priority:"high",href:`/shipments/${s.id}`});
    else if(s.status==="Awaiting Booking") tasks.push({id:`pay-${s.id}`,title:`Bayar deposit ${s.id}`,description:`Amankan keberangkatan ke ${s.destinationPort}.`,dueLabel:formatDate(s.cargoReadyDate),priority:"medium",href:`/checkout/${s.id}`});
    else if(s.status==="Awaiting Match") tasks.push({id:`match-${s.id}`,title:`Konfirmasi slot ${s.destinationPort}`,description:`Belum ada container yang dipilih untuk ${s.id}.`,dueLabel:formatDate(s.cargoReadyDate),priority:"high",href:"/matching"});
    if(tasks.length>=3) break;
  }
  return tasks;
}

function DashboardPage(){
  const{user}=useAuth();
  const{data:shipments,loading:loadingShipments}=useShipments();
  const{data:containers}=useContainers();
  const{data:documents}=useDocuments();
  const activeShipments=shipments.filter(s=>!["Delivered","Cancelled"].includes(s.status)).length;
  const documentsIncomplete=documents.filter(d=>d.status==="draft").length;
  const totalCost=shipments.reduce((sum,s)=>sum+(s.orderAmountIdr??0),0);
  const tasks=buildTasks(shipments);
  return <><header className="page-header"><div><h1 className="page-title">Dashboard Ekspor</h1><p className="page-subtitle">Selamat datang kembali, {user?.name?.split(" ")[0]??""}. Berikut progres ekspor furniture Anda.</p></div><div className="top-nav-actions"><label className="search"><Search size={18}/><span className="sr-only">Cari</span><input placeholder="Cari pengiriman atau dokumen..."/></label></div></header><section className="grid metrics"><MetricCard label="Pengiriman aktif" value={String(activeShipments)} hint={`${shipments.length} total pengiriman`} icon={Ship}/><MetricCard label="Match tersedia" value={String(containers.length)} hint="Container Consolidated LCL menuju Jepang" icon={PackageOpen}/><MetricCard label="Dokumen belum lengkap" value={String(documentsIncomplete)} hint={`${documents.length} total dokumen`} icon={FileText}/><MetricCard label="Total nilai booking" value={formatRupiah(totalCost)} hint="Akumulasi seluruh pengiriman" icon={Banknote}/></section><section className="grid two-col section"><div className="card"><div className="section-head"><h2 className="section-title">Pengiriman saya</h2><Link className="btn btn-ghost" href="/shipments">Lihat semua</Link></div>{loadingShipments?<PageLoading/>:<ShipmentTable items={shipments.slice(0,3)}/>}</div><div className="card"><div className="section-head"><h2 className="section-title">Perlu perhatian</h2><span className="badge danger">{tasks.length} tugas</span></div><TaskList tasks={tasks}/></div></section><section className="grid two-col section"><div className="card"><div className="section-head"><h2 className="section-title">Status dokumen ekspor</h2><Link href="/documents" className="btn btn-ghost">Kelola dokumen</Link></div><DocumentChecklist documents={documents.slice(0,4)}/></div><div><div className="section-head"><h2 className="section-title">Match tersedia</h2><Link href="/matching" className="btn btn-ghost">Lihat semua</Link></div>{containers[0]&&<ContainerMatchCard match={containers[0]} compact/>}</div></section></>}

function ShipmentsPage(){
  const{data:shipments,loading}=useShipments();
  const[query,setQuery]=useState("");
  const[status,setStatus]=useState("Semua status");
  const filtered=shipments.filter(s=>(status==="Semua status"||s.status===status)&&(s.id+s.destinationPort).toLowerCase().includes(query.toLowerCase()));
  return <div className="figma-page"><header className="transaction-head"><div><h1 className="figma-heading">Pengiriman & Pembayaran</h1><p className="figma-subtitle">Kelola dan pantau transaksi ekspor Anda.</p></div><div className="page-actions"><button className="btn btn-ghost"><FileDown size={16}/> Ekspor CSV</button></div></header><div className="figma-card transaction-filters"><label className="search"><Search size={18}/><span className="sr-only">Cari pengiriman</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari ID, tujuan..."/></label><select aria-label="Filter status" value={status} onChange={e=>setStatus(e.target.value)} className="btn btn-ghost"><option>Semua status</option>{Array.from(new Set(shipments.map(s=>s.status))).map(st=><option key={st}>{st}</option>)}</select><label className="field" style={{position:"relative"}}><span className="sr-only">Rentang tanggal</span><input value="1 Jan – 31 Mar 2026" readOnly/></label></div>{loading?<PageLoading/>:<div className="figma-card transaction-card"><table className="figma-table"><thead><tr><th>ID Pengiriman</th><th>Tanggal</th><th>Tujuan</th><th>Estimasi biaya</th><th>Status pengiriman</th><th>Aksi</th></tr></thead><tbody>{filtered.map(s=><tr key={s.id}><td><Link href={`/shipments/${s.id}`}>{s.id}</Link></td><td>{formatDate(s.cargoReadyDate)}</td><td>{s.destinationPort}, JP</td><td>{s.orderAmountIdr?formatRupiah(s.orderAmountIdr):"—"}</td><td><StatusBadge status={shipmentLabels[s.status]}/></td><td><Link href={`/shipments/${s.id}`} aria-label={`Lihat ${s.id}`}><ChevronRight size={18}/></Link></td></tr>)}</tbody></table><div className="transaction-pagination"><span>Menampilkan 1–{filtered.length} dari {shipments.length} entri</span><div className="pages"><button className="page-btn">‹</button><button className="page-btn active">1</button><button className="page-btn">›</button></div></div></div>}</div>}

function ShipmentForm({onCreated}:{onCreated:(shipmentCode:string)=>void}){
  const[errors,setErrors]=useState<Record<string,string>>({});
  const[submitted,setSubmitted]=useState(false);
  const[pending,setPending]=useState<Record<string,unknown>|null>(null);
  const[submitting,setSubmitting]=useState(false);
  const[apiError,setApiError]=useState<string|null>(null);
  function validate(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const required=["origin","country","port","category","description","hsCode","cbm","quantity","weight","netWeight","ready","end","packaging","consigneeName","consigneeCompany","consigneeAddress","consigneeEmail"];
    const next:Record<string,string>={};
    required.forEach(k=>{if(!f.get(k))next[k]="Kolom ini wajib diisi."});
    if(Number(f.get("cbm"))<=0)next.cbm="CBM harus lebih dari 0.";
    setErrors(next);
    if(Object.keys(next).length)return;
    setPending(Object.fromEntries(f.entries()));
    setSubmitted(true);
  }
  async function confirmCreate(){
    if(!pending)return;
    setSubmitting(true);setApiError(null);
    try{
      const res=await api.post<{data:{shipmentCode:string}}>("/shipments",{
        originCity:pending.origin,originPort:"Tanjung Emas, Semarang",destinationCountry:pending.country,destinationPort:pending.port,
        cargoReadyDate:pending.ready,flexibleDateEnd:pending.end,cbm:Number(pending.cbm),
        consignee:{name:pending.consigneeName,company:pending.consigneeCompany,address:pending.consigneeAddress,email:pending.consigneeEmail},
        product:{description:pending.description,hsCode:pending.hsCode,category:pending.category,quantity:Number(pending.quantity),quantityUnit:"unit",grossWeight:Number(pending.weight),netWeight:Number(pending.netWeight),packaging:pending.packaging,stackable:pending.stackable==="on",fragile:pending.fragile==="on"},
        additionalHandling:pending.handling||undefined,
      });
      setSubmitted(false);
      onCreated(res.data.shipmentCode);
    }catch(e){setApiError(e instanceof ApiError?e.message:"Gagal membuat pengiriman.");}
    finally{setSubmitting(false);}
  }
  return <><PageHeader eyebrow="Pengiriman baru" title="Ceritakan detail kargo Anda" subtitle="Data ini digunakan ulang untuk matching dan draft dokumen agar Anda tidak perlu mengisi informasi yang sama berulang kali." actions={<Link href="/shipments" className="btn btn-ghost"><ArrowLeft size={16}/> Batal</Link>}/><form className="card" onSubmit={validate} noValidate><div className="section-head"><div><h2 className="section-title">Rute dan kesiapan kargo</h2><p className="page-subtitle">Masukkan volume final setelah pengemasan.</p></div><span className="badge info">Langkah 1 dari 3</span></div><div className="form-grid"><Field name="origin" label="Kota atau pelabuhan asal" placeholder="Contoh: Jepara / Tanjung Emas" error={errors.origin}/><Field name="country" label="Negara tujuan" placeholder="Jepang" error={errors.country}/><Field name="port" label="Pelabuhan tujuan" placeholder="Tokyo" error={errors.port}/><SelectField name="category" label="Kategori produk" error={errors.category} options={["","Furniture kayu","Furniture rotan","Dekorasi interior"]}/><Field name="description" label="Deskripsi produk" placeholder="Meja makan kayu jati solid" error={errors.description}/><Field name="hsCode" label="HS Code" placeholder="9403.60" error={errors.hsCode}/><Field name="cbm" type="number" label="CBM final setelah pengemasan" placeholder="5" error={errors.cbm}/><Field name="quantity" type="number" label="Jumlah barang (unit)" placeholder="18" error={errors.quantity}/><Field name="weight" type="number" label="Berat kotor (kg)" placeholder="1850" error={errors.weight}/><Field name="netWeight" type="number" label="Berat bersih (kg)" placeholder="1640" error={errors.netWeight}/><Field name="ready" type="date" label="Cargo Ready Date" error={errors.ready}/><Field name="end" type="date" label="Batas fleksibel keberangkatan" error={errors.end}/><SelectField name="packaging" label="Jenis kemasan" error={errors.packaging} options={["","Peti kayu fumigasi","Karton dan pallet","Karton berlapis","Crate"]}/><Field name="consigneeName" label="Nama penerima (consignee)" placeholder="Aiko Tanaka" error={errors.consigneeName}/><Field name="consigneeCompany" label="Perusahaan penerima" placeholder="Mori Living Co., Ltd." error={errors.consigneeCompany}/><Field name="consigneeAddress" label="Alamat penerima" placeholder="2-8-4 Aomi, Koto, Tokyo" error={errors.consigneeAddress}/><Field name="consigneeEmail" type="email" label="Email penerima" placeholder="aiko@mori-living.jp" error={errors.consigneeEmail}/><label className="check-row"><input type="checkbox" name="stackable"/> Kargo dapat ditumpuk</label><label className="check-row"><input type="checkbox" name="fragile"/> Kargo rapuh / fragile</label><div className="field span-2"><label htmlFor="handling">Kebutuhan penanganan tambahan</label><textarea id="handling" name="handling" placeholder="Contoh: jaga tetap kering, dilarang ditumpuk, perlu forklift..."/></div></div>{apiError&&<p className="field-error" style={{marginTop:14}}>{apiError}</p>}<div style={{display:"flex",justifyContent:"flex-end",marginTop:22}}><button className="btn btn-primary" type="submit">Simpan dan cari match <ArrowRight size={16}/></button></div></form>{submitted&&<ConfirmationModal title="Buat pengiriman baru?" description="KUBO akan menyimpan draft pengiriman dan mencari peluang Consolidated LCL yang kompatibel." confirmLabel={submitting?"Menyimpan...":"Buat pengiriman"} onClose={()=>setSubmitted(false)} onConfirm={confirmCreate}/>}</>}
function Field({name,label,error,type="text",placeholder,defaultValue}:{name:string;label:string;error?:string;type?:string;placeholder?:string;defaultValue?:string|number}){return <div className="field"><label htmlFor={name}>{label}</label><input id={name} name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} aria-invalid={Boolean(error)} aria-describedby={error?`${name}-error`:undefined}/>{error&&<span id={`${name}-error`} className="field-error">{error}</span>}</div>}
function SelectField({name,label,options,error}:{name:string;label:string;options:string[];error?:string}){return <div className="field"><label htmlFor={name}>{label}</label><select id={name} name={name} aria-invalid={Boolean(error)}>{options.map((o,i)=><option key={o||"empty"} value={o}>{i===0&&!o?"Pilih opsi":o}</option>)}</select>{error&&<span className="field-error">{error}</span>}</div>}

const timelineSteps=["Draft","Matched","Booked","Cargo diterima","Dalam perjalanan"];
const timelineIndexByStatus:Record<string,number>={"Draft":0,"Awaiting Match":0,"Matched":1,"Documents Incomplete":1,"Awaiting Verification":1,"Awaiting Booking":1,"Booked":2,"Cargo Ready":2,"Cargo Received":3,"In Transit":4,"Customs Processing":4,"Delivered":4,"Cancelled":0};

function CargoInformationCard({shipment:s,onSaved}:{shipment:Shipment;onSaved:(shipment:Shipment)=>void}){
  const[editing,setEditing]=useState(false);
  const[submitting,setSubmitting]=useState(false);
  const[error,setError]=useState<string|null>(null);
  const[saved,setSaved]=useState(false);
  const editable=s.status==="Draft"||s.status==="Awaiting Match";

  async function save(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=new FormData(e.currentTarget);
    const description=String(form.get("cargo-description")||"").trim();
    const hsCode=String(form.get("cargo-hs-code")||"").trim();
    const packaging=String(form.get("cargo-packaging")||"").trim();
    const cargoReadyDate=String(form.get("cargo-ready-date")||"");
    const flexibleDateEnd=String(form.get("cargo-flexible-date-end")||"");
    const additionalHandling=String(form.get("cargo-handling")||"").trim();
    const quantity=Number(form.get("cargo-quantity"));
    const cbm=Number(form.get("cargo-cbm"));
    const grossWeight=Number(form.get("cargo-gross-weight"));
    const netWeight=Number(form.get("cargo-net-weight"));

    if(!description||!hsCode||!packaging||!cargoReadyDate||!flexibleDateEnd){setError("Lengkapi seluruh informasi kargo wajib.");return;}
    if(!Number.isInteger(quantity)||quantity<=0){setError("Jumlah barang harus berupa bilangan bulat lebih dari 0.");return;}
    if(cbm<=0||grossWeight<=0||netWeight<=0){setError("CBM dan berat harus lebih dari 0.");return;}
    if(netWeight>grossWeight){setError("Berat bersih tidak boleh lebih besar dari berat kotor.");return;}
    if(cargoReadyDate>flexibleDateEnd){setError("Cargo Ready Date tidak boleh melewati batas fleksibel keberangkatan.");return;}

    setSubmitting(true);setError(null);setSaved(false);
    try{
      const res=await api.patch<{data:ApiShipment}>(`/shipments/${s.id}`,{
        cargoReadyDate,flexibleDateEnd,cbm,additionalHandling,
        product:{description,hsCode,quantity,grossWeight,netWeight,packaging},
      });
      onSaved(mapShipment(res.data));
      setEditing(false);setSaved(true);setTimeout(()=>setSaved(false),3000);
    }catch(e){
      setError(e instanceof ApiError?e.message:"Gagal memperbarui informasi kargo.");
    }finally{
      setSubmitting(false);
    }
  }

  const packagingOptions=Array.from(new Set([s.product.packaging,"Peti kayu fumigasi","Karton dan pallet","Karton berlapis","Crate"]));
  return <div className="card"><div className="section-head"><h2 className="section-title">Informasi kargo</h2>{editable&&!editing&&<button className="btn btn-secondary" type="button" onClick={()=>{setEditing(true);setSaved(false);setError(null);}}><Edit3 size={15}/> Edit kargo</button>}</div>{editing?<form onSubmit={save} noValidate><div className="form-grid" style={{marginTop:18}}><Field name="cargo-description" label="Deskripsi produk" defaultValue={s.product.description}/><Field name="cargo-hs-code" label="HS Code" defaultValue={s.product.hsCode}/><Field name="cargo-quantity" type="number" label={`Jumlah (${s.product.quantityUnit})`} defaultValue={s.product.quantity}/><Field name="cargo-cbm" type="number" label="CBM final" defaultValue={s.cbm}/><Field name="cargo-gross-weight" type="number" label={`Berat kotor (${s.product.weightUnit})`} defaultValue={s.product.grossWeight}/><Field name="cargo-net-weight" type="number" label={`Berat bersih (${s.product.weightUnit})`} defaultValue={s.product.netWeight}/><div className="field"><label htmlFor="cargo-packaging">Kemasan</label><select id="cargo-packaging" name="cargo-packaging" defaultValue={s.product.packaging}>{packagingOptions.map(option=><option key={option} value={option}>{option}</option>)}</select></div><Field name="cargo-ready-date" type="date" label="Cargo Ready Date" defaultValue={s.cargoReadyDate}/><Field name="cargo-flexible-date-end" type="date" label="Batas fleksibel keberangkatan" defaultValue={s.flexibleDateEnd}/><div className="field span-2"><label htmlFor="cargo-handling">Penanganan tambahan</label><textarea id="cargo-handling" name="cargo-handling" defaultValue={s.additionalHandling} placeholder="Contoh: jaga tetap kering, dilarang ditumpuk..."/></div></div>{error&&<p className="field-error" style={{marginTop:14}}>{error}</p>}<div className="page-actions" style={{justifyContent:"flex-end",marginTop:18}}><button className="btn btn-ghost" type="button" disabled={submitting} onClick={()=>{setEditing(false);setError(null);}}>Batal</button><button className="btn btn-primary" type="submit" disabled={submitting}><Check size={15}/> {submitting?"Menyimpan...":"Simpan perubahan"}</button></div></form>:<div className="meta-grid" style={{marginTop:18}}><Meta label="Deskripsi produk" value={s.product.description}/><Meta label="HS Code" value={s.product.hsCode}/><Meta label="Jumlah" value={`${s.product.quantity} ${s.product.quantityUnit}`}/><Meta label="CBM final" value={`${s.cbm} CBM`}/><Meta label="Berat kotor / bersih" value={`${s.product.grossWeight} / ${s.product.netWeight} ${s.product.weightUnit}`}/><Meta label="Kemasan" value={s.product.packaging}/><Meta label="Cargo Ready Date" value={formatDate(s.cargoReadyDate)}/><Meta label="Batas fleksibel" value={formatDate(s.flexibleDateEnd)}/><Meta label="Penanganan" value={s.additionalHandling||"-"}/></div>}{!editable&&<p className="page-subtitle" style={{marginTop:16}}>Informasi kargo dikunci setelah shipment mendapatkan match.</p>}{saved&&<Toast message="Informasi kargo diperbarui. Matching berikutnya akan memakai data terbaru."/>}</div>;
}

function ShipmentDetail({id}:{id?:string}){
  const{data:loadedShipment,loading,error}=useShipment(id);
  const{data:documents}=useDocuments(id);
  const[updatedShipment,setUpdatedShipment]=useState<Shipment|null>(null);
  if(loading)return <PageLoading/>;
  const s=updatedShipment?.id===id?updatedShipment:loadedShipment;
  if(error||!s)return <ErrorNote message={error??"Pengiriman tidak ditemukan."}/>;
  const current=timelineIndexByStatus[s.status]??0;
  const awaitingMatch=s.status==="Draft"||s.status==="Awaiting Match";
  return <><PageHeader eyebrow="Detail pengiriman" title={s.id} subtitle={`${s.product.description} • ${s.originCity} ke ${s.destinationPort}`} actions={<><Link className="btn btn-ghost" href="/shipments"><ArrowLeft size={16}/> Kembali</Link><Link className="btn btn-primary" href={awaitingMatch?"/matching":`/checkout/${s.id}`}>{awaitingMatch?"Cari container match":"Lanjutkan tindakan"}</Link></>}/><section className="card"><div style={{display:"flex",justifyContent:"space-between",gap:15,flexWrap:"wrap"}}><div><StatusBadge status={shipmentLabels[s.status]}/><div style={{marginTop:10}}><span className="meta-label">Status pembayaran </span><StatusBadge status={s.paymentStatus}/></div></div><div><div className="meta-label">Tindakan berikutnya</div><strong style={{color:"var(--navy-950)"}}>{s.nextAction}</strong></div></div><div className="timeline">{timelineSteps.map((x,i)=><div className={`timeline-step ${i<current?"done":i===current?"current":""}`} key={x}><div className="timeline-dot">{i<current?<Check size={14}/>:i+1}</div>{x}</div>)}</div></section><section className="grid two-col section"><CargoInformationCard shipment={s} onSaved={setUpdatedShipment}/><div className="card"><h2 className="section-title">Pihak terkait</h2><div style={{marginTop:18}}><div className="meta-label">Eksportir</div><strong>{s.exporter.company}</strong><p className="page-subtitle">{s.exporter.name}<br/>{s.exporter.address}</p></div><div style={{marginTop:20}}><div className="meta-label">Buyer / Consignee</div><strong>{s.consignee.company}</strong><p className="page-subtitle">{s.consignee.name}<br/>{s.consignee.address}</p></div></div></section><section className="card section"><div className="section-head"><h2 className="section-title">Dokumen pengiriman</h2><Link href="/documents" className="btn btn-secondary">Kelola dokumen</Link></div><DocumentChecklist documents={documents}/></section></>}

function LocationLabel({location}:{location:VesselIdentity["estimatedLocation"]}){
  if(!location)return <>—</>;
  return <>±{location.approxDistanceKm} km dari {location.city}, {location.country}<InfoTooltip text={location.justification}/></>;
}

function VesselTrackCard({vessel}:{vessel:VesselIdentity}){
  return <div className="vessel-track-item"><div className="vessel-track-head"><div><div className="vessel-track-name"><Ship size={14} style={{display:"inline",marginRight:6,verticalAlign:-2}}/>{vessel.name??`MMSI ${vessel.mmsi}`}</div><div className="vessel-track-sub">{vessel.shipTypeLabel??"Tipe kapal tidak diketahui"}{vessel.imo?` • IMO ${vessel.imo}`:""}</div></div>{vessel.fullnessPercent!=null?<StatusBadge status={`${vessel.fullnessPercent}% muatan`}/>:<span className="badge neutral">Muatan belum diketahui</span>}</div><div className="vessel-track-meta"><div><div className="meta-label">Estimasi muatan (real-time via AIS){vessel.fullnessJustification&&<InfoTooltip text={vessel.fullnessJustification}/>}</div>{vessel.fullnessPercent!=null?<><CapacityProgress occupancy={vessel.fullnessPercent} label="Estimasi terisi"/><small style={{color:"var(--muted)"}}>Diperbarui {formatRelativeTime(vessel.fullnessUpdatedAt)}</small></>:<div className="meta-value">Menunggu ≥2 pembacaan draught AIS</div>}</div><div><div className="meta-label">Draught AIS terakhir</div><div className="meta-value">{vessel.lastDraughtM!=null?`${vessel.lastDraughtM.toFixed(2)} m`:"—"}</div></div><div><div className="meta-label">Estimasi kapasitas (CBM){vessel.capacityEstimateJustification&&<InfoTooltip text={vessel.capacityEstimateJustification}/>}</div><div className="meta-value">{vessel.estimatedCapacityCbm!=null?`${vessel.estimatedCapacityCbm.toLocaleString("id-ID")} CBM`:"—"}<span style={{color:"var(--muted)",fontWeight:400}}>{vessel.estimatedTeu!=null?` (~${vessel.estimatedTeu} TEU)`:""}</span></div></div><div><div className="meta-label"><MapPin size={10} style={{display:"inline"}}/> Perkiraan posisi</div><div className="meta-value"><LocationLabel location={vessel.estimatedLocation}/> <span style={{color:"var(--muted)",fontWeight:400}}>({formatRelativeTime(vessel.lastPositionAt)})</span></div></div></div></div>;
}

function VesselTrackingSection(){
  const{data:vessels,loading}=useVessels();
  return <><div className="section-head"><h2 className="section-title"><Anchor size={16} style={{display:"inline",marginRight:6,verticalAlign:-2}}/>Kapal Besar Terlacak Menuju Jepang</h2><span className="badge info">AIS live • Tanjung Emas/Perak → Jepang</span></div>{loading?<PageLoading/>:vessels.length===0?<EmptyState icon={Ship} title="Belum ada kapal besar terdeteksi" description="Sistem melacak kapal kargo besar (bukan kapal tunda/tongkang) secara live via AIS (AISstream.io) di sekitar Tanjung Emas, Tanjung Perak, dan pelabuhan Jepang. Kapal akan muncul di sini begitu benar-benar terdeteksi - tidak ada data simulasi."/>:<div className="vessel-track-list">{vessels.map(v=><VesselTrackCard vessel={v} key={v.mmsi}/>)}</div>}<div className="figma-card no-match-actions"><div><h3>Tetap lanjutkan pengujian dokumen</h3><p>OCR, klasifikasi, dan ekstraksi data tidak membutuhkan container match.</p></div><Link className="btn btn-primary" href="/documents"><FileText size={16}/> Uji dokumen & OCR</Link></div></>;
}

function isInboundEstimate(m:ContainerMatch):boolean{
  if(m.departureConfirmed)return false;
  return m.estimatedDeparture>new Date().toISOString().slice(0,10);
}

function MatchingPage(){
  const{data:shipments,loading:shipmentsLoading}=useShipments();
  const[createdCode,setCreatedCode]=useState<string|null>(null);
  const pending=shipments.find(s=>s.status==="Draft"||s.status==="Awaiting Match");
  const activeId=createdCode??pending?.id;
  const{data:activeShipment,loading:activeLoading}=useShipment(activeId);
  if(shipmentsLoading)return <PageLoading/>;
  if(!activeId)return <ShipmentForm onCreated={setCreatedCode}/>;
  if(activeLoading||!activeShipment)return <PageLoading/>;
  return <MatchResultsForShipment shipment={activeShipment} key={activeShipment.id}/>;
}

function MatchResultsForShipment({shipment}:{shipment:Shipment}){
  const[results,setResults]=useState<ContainerMatch[]>([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState<string|null>(null);
  useEffect(()=>{
    let cancelled=false;
    findMatches("Japan",shipment.cbm,shipment.cargoReadyDate)
      .then(found=>{if(!cancelled){setResults(found);setLoading(false);}})
      .catch(e=>{if(!cancelled){setError(e instanceof ApiError?e.message:"Gagal mencari match.");setLoading(false);}});
    return()=>{cancelled=true;};
  },[shipment.id,shipment.cbm,shipment.cargoReadyDate]);
  return <div className="figma-page"><header><h1 className="figma-heading">Container Matching</h1><p className="figma-subtitle">Pilih container terbaik untuk pengiriman {shipment.id} • {shipment.cbm} CBM ke {shipment.destinationPort}, {shipment.destinationCountry}.</p></header>{error&&<p className="field-error">{error}</p>}<div className="matching-result-head"><h2>Kontainer tersedia</h2><strong style={{fontSize:11}}>{results.length} PENGIRIMAN DITEMUKAN</strong></div>{loading?<PageLoading/>:results.length===0?<VesselTrackingSection/>:results.map((m,i)=><article className="figma-card match-row" key={m.id}><div className="match-row-top"><div className="match-route"><span className="ship-square"><Ship size={21}/></span><div><h3>{m.destinationPort}, JP {m.departureConfirmed?<span className="badge success" style={{fontSize:9,marginLeft:4}}>Berangkat (AIS)</span>:<span className="badge info" style={{fontSize:9,marginLeft:4}}>{isInboundEstimate(m)?"Menuju pelabuhan asal":"Estimasi"}{m.departureEstimateJustification&&<InfoTooltip text={m.departureEstimateJustification}/>}</span>}</h3><p><CalendarDays size={11} style={{display:"inline"}}/> {m.departureConfirmed?"Berangkat (nyata)":isInboundEstimate(m)?"Estimasi tiba & siap muat":"Estimasi siap muat"}: {formatDate(m.estimatedDeparture)}{m.daysFromPreferredDate!=null&&<span style={{color:"var(--muted)"}}> ({m.daysFromPreferredDate===0?"tepat pada Cargo Ready Date Anda":m.daysFromPreferredDate>0?`${m.daysFromPreferredDate} hari setelah Cargo Ready Date Anda`:`${Math.abs(m.daysFromPreferredDate)} hari sebelum Cargo Ready Date Anda`})</span>}</p>{m.vessel&&<p style={{marginTop:2}}>{m.vessel.name??`MMSI ${m.vessel.mmsi}`}{m.vessel.fullnessPercent!=null?` • ~${m.vessel.fullnessPercent}% muatan`:""}{m.vessel.estimatedCapacityCbm!=null?` • ~${m.vessel.estimatedCapacityCbm.toLocaleString("id-ID")} CBM`:""}</p>}{m.estimatedArrivalInJapan&&<p style={{marginTop:2,fontSize:11}}><Gauge size={11} style={{display:"inline",marginRight:3,verticalAlign:-1}}/>Perkiraan tiba di {m.destinationPort}: {formatDate(m.estimatedArrivalInJapan)}{m.estimatedArrivalJustification&&<InfoTooltip text={m.estimatedArrivalJustification}/>}</p>}{m.originPortDistanceFromJeparaKm!=null&&<p style={{marginTop:2,color:"var(--muted)",fontSize:11}}>±{m.originPortDistanceFromJeparaKm} km dari Jepara{m.originPortDistanceJustification&&<InfoTooltip text={m.originPortDistanceJustification}/>}</p>}</div></div><div className="match-price"><small>ESTIMASI TOTAL • {shipment.cbm} CBM{m.freightEstimateJustification&&<InfoTooltip text={m.freightEstimateJustification}/>}</small><strong>{formatRupiah(m.costs.total)}</strong></div></div><div style={{fontSize:10,fontWeight:700,marginTop:18}}>Kapasitas saat ini <span style={{float:"right",color:"#041a6c"}}>{m.occupancy}% penuh</span></div><CapacityProgress occupancy={m.occupancy}/><div className="match-capacity-copy"><span>{m.participants} UMKM bergabung</span><em>{m.remainingCbm} CBM tersedia</em></div>{m.aiRationale&&<p style={{fontSize:11,color:"var(--muted)",marginTop:10,fontStyle:"italic"}}><Sparkles size={11} style={{display:"inline",marginRight:4}}/>Catatan AI{m.finalScoreJustification&&<InfoTooltip text={m.finalScoreJustification}/>}: {m.aiRationale}</p>}<div className="match-row-foot"><span className={`match-signal ${i===1?"pending":""}`}>{m.status}</span><Link className="btn btn-primary" href={`/matching/${m.id}`}>Gabung Pengiriman</Link></div></article>)}</div>}

function MatchDetail({id}:{id?:string}){
  const router=useRouter();
  const{data:shipments}=useShipments();
  const active=shipments.find(s=>s.status==="Draft"||s.status==="Awaiting Match");
  const{data:m,loading,error}=useContainer(id,active?.cbm);
  const[confirm,setConfirm]=useState(false);
  if(loading)return <PageLoading/>;
  if(error||!m)return <ErrorNote message={error??"Match tidak ditemukan."}/>;
  function joinShipment(){
    setConfirm(false);
    router.push(active?`/checkout/${active.id}?containerId=${m!.id}`:"/matching");
  }
  const v=m.vessel;
  const cbmLabel=active?active.cbm:5;
  return <><PageHeader eyebrow="Detail matching" title={`${m.originPort.split(",")[0]} → ${m.destinationPort}`} subtitle={`${m.shipmentType} di kapal ${v?.name??"(kapal belum teridentifikasi)"}`} actions={<Link href="/matching" className="btn btn-ghost"><ArrowLeft size={16}/> Kembali</Link>}/><section className="grid two-col"><div className="card"><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><StatusBadge status={m.status}/><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><span className={`badge ${m.departureConfirmed?"success":"info"}`}>{m.departureConfirmed?"Keberangkatan dikonfirmasi AIS":"Keberangkatan estimasi"}{!m.departureConfirmed&&m.departureEstimateJustification&&<InfoTooltip text={m.departureEstimateJustification}/>}</span><span className={`badge ${m.destinationConfidence==="confirmed_by_geofence"?"success":"info"}`}>{m.destinationConfidence==="confirmed_by_geofence"?"Tujuan dikonfirmasi AIS":"Tujuan estimasi dari AIS"}</span></div></div><div className="route" style={{fontSize:20,margin:"28px 0"}}><span>{m.originPort}</span><span className="route-line"/><span>{m.destinationPort}</span></div><CapacityProgress occupancy={m.occupancy}/>{m.aiRationale&&<div className="card" style={{boxShadow:"none",marginTop:16,background:"#fff8ef"}}><div className="meta-label"><Sparkles size={11} style={{display:"inline",marginRight:4}}/>Catatan AI{m.finalScoreJustification&&<InfoTooltip text={m.finalScoreJustification}/>}</div><p className="page-subtitle" style={{marginTop:4}}>{m.aiRationale}</p></div>}<div className="meta-grid" style={{marginTop:24}}><Meta label={m.departureConfirmed?"Berangkat (nyata, via AIS)":isInboundEstimate(m)?"Estimasi tiba & siap muat":"Estimasi siap muat"} value={formatDate(m.estimatedDeparture)}/><Meta label="Transit" value={m.transitDays!=null?`${m.transitDays} hari (aktual)`:"Belum diketahui - kapal belum tiba"}/>{m.estimatedArrivalInJapan&&<Meta label="Perkiraan tiba (real-time)" value={formatDate(m.estimatedArrivalInJapan)}/>}<Meta label="Cargo cut-off" value={formatDate(m.cargoCutoff)}/><Meta label="Document cut-off" value={formatDate(m.documentCutoff)}/><Meta label="Kapasitas tersisa" value={`${m.remainingCbm} CBM`}/><Meta label="UMKM bergabung" value={`${m.participants} usaha`}/>{m.originPortDistanceFromJeparaKm!=null&&<Meta label="Jarak pelabuhan asal dari Jepara" value={`±${m.originPortDistanceFromJeparaKm} km`}/>}</div><div className="card" style={{boxShadow:"none",marginTop:22,background:"#f7f7ff"}}><div className="meta-label"><Anchor size={11} style={{display:"inline",marginRight:4}}/>Kapal & Pelacakan Live</div>{v?<><h3 style={{fontWeight:800,marginTop:5}}>{v.name??`MMSI ${v.mmsi}`}</h3><p className="page-subtitle">{v.shipTypeLabel??"Tipe tidak diketahui"}{v.imo?` • IMO ${v.imo}`:""} • MMSI {v.mmsi}</p><div className="meta-grid" style={{marginTop:14}}><div><div className="meta-label"><Gauge size={10} style={{display:"inline"}}/> Estimasi muatan (real-time){v.fullnessJustification&&<InfoTooltip text={v.fullnessJustification}/>}</div><div className="meta-value">{v.fullnessPercent!=null?`${v.fullnessPercent}% (draught ${v.lastDraughtM?.toFixed(2)} m)`:"Menunggu data draught AIS"}</div>{v.fullnessPercent!=null&&<small style={{color:"var(--muted)"}}>Diperbarui {formatRelativeTime(v.fullnessUpdatedAt)}</small>}</div><div><div className="meta-label">Estimasi kapasitas (CBM){v.capacityEstimateJustification&&<InfoTooltip text={v.capacityEstimateJustification}/>}</div><div className="meta-value">{v.estimatedCapacityCbm!=null?`${v.estimatedCapacityCbm.toLocaleString("id-ID")} CBM`:"—"}</div>{v.estimatedTeu!=null&&<small style={{color:"var(--muted)"}}>~{v.estimatedTeu} TEU</small>}</div><div><div className="meta-label"><MapPin size={10} style={{display:"inline"}}/> Perkiraan posisi</div><div className="meta-value"><LocationLabel location={v.estimatedLocation}/></div></div><div><div className="meta-label">Update posisi terakhir</div><div className="meta-value">{formatRelativeTime(v.lastPositionAt)}</div></div>{v.lastEtaRaw&&<div><div className="meta-label">ETA menurut kapal (AIS, dilaporkan kru)</div><div className="meta-value">{v.lastEtaRaw}</div></div>}{m.estimatedArrivalJustification&&<div><div className="meta-label">Perkiraan tiba KUBO{m.estimatedArrivalJustification&&<InfoTooltip text={m.estimatedArrivalJustification}/>}</div><div className="meta-value">{m.estimatedArrivalInJapan?formatDate(m.estimatedArrivalInJapan):"—"}</div></div>}</div></>:<p className="page-subtitle">Identitas kapal belum tersedia dari AIS untuk pelayaran ini.</p>}</div></div><aside className="card"><h2 className="section-title">Estimasi biaya Anda</h2><p className="page-subtitle">{`Perhitungan untuk ${cbmLabel} CBM. `}Biaya layanan KUBO (Rp 500/CBM) bersifat tetap; biaya freight forwarder adalah estimasi{m.freightEstimateJustification&&<InfoTooltip text={m.freightEstimateJustification}/>} - nilai akhir dikonfirmasi forwarder sebelum pembayaran.</p><div style={{marginTop:18}}><CostBreakdown costs={m.costs}/></div><button className="btn btn-primary" style={{width:"100%",marginTop:20}} onClick={()=>setConfirm(true)}>Gabung pengiriman ini</button><p className="page-subtitle" style={{fontSize:10,textAlign:"center"}}>Slot belum terpesan sampai Anda menyelesaikan checkout.</p></aside></section>{confirm&&<ConfirmationModal title="Gabung slot ini?" description={`Anda akan mengalokasikan muatan pada rute ke ${m.destinationPort}. Lanjutkan ke checkout untuk memilih metode pembayaran.`} confirmLabel="Lanjut ke Checkout" onClose={()=>setConfirm(false)} onConfirm={joinShipment}/>}</>}

function DocumentsPage(){
  const[refreshToken,setRefreshToken]=useState(0);
  const{data:documents,loading}=useDocuments(undefined,refreshToken);
  const{data:shipments,loading:shipmentsLoading}=useShipments();
  const{data:documentTypes}=useDocumentTypes();
  const[selectedShipmentId,setSelectedShipmentId]=useState("");
  const[selectedType,setSelectedType]=useState("");
  const[file,setFile]=useState<File|null>(null);
  const[uploading,setUploading]=useState(false);
  const[uploadError,setUploadError]=useState<string|null>(null);
  const[processing,setProcessing]=useState<DocumentProcessingResult|null>(null);
  const[extractions,setExtractions]=useState<DocumentExtraction[]>([]);

  useEffect(()=>{
    if(!processing?.documentId||!processing.processingStatus||terminalDocumentStatuses.has(processing.processingStatus))return;
    let cancelled=false;
    const timer=setTimeout(async()=>{
      try{
        const res=await api.get<{data:DocumentProcessingResult}>(`/documents/${processing.documentId}/status`);
        if(!cancelled)setProcessing(res.data);
      }catch(e){
        if(!cancelled)setUploadError(e instanceof ApiError?e.message:"Gagal memuat status pemrosesan.");
      }
    },1500);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[processing]);

  useEffect(()=>{
    if(!processing?.documentId||!processing.processingStatus||!terminalDocumentStatuses.has(processing.processingStatus))return;
    if(processing.processingStatus==="failed")return;
    let cancelled=false;
    api.get<{data:DocumentExtraction[]}>(`/documents/${processing.documentId}/extractions`)
      .then(res=>{if(!cancelled){setExtractions(res.data);setRefreshToken(n=>n+1);}})
      .catch(e=>{if(!cancelled)setUploadError(e instanceof ApiError?e.message:"Gagal memuat hasil ekstraksi.");});
    return()=>{cancelled=true;};
  },[processing?.documentId,processing?.processingStatus]);

  const activeShipmentId=selectedShipmentId||pickShipment(shipments)?.id||"";

  async function uploadDocument(){
    if(!file||!activeShipmentId)return;
    setUploading(true);setUploadError(null);setExtractions([]);setProcessing(null);
    const form=new FormData();
    form.append("file",file);
    if(selectedType)form.append("declaredDocumentType",selectedType);
    try{
      const res=await api.post<{data:DocumentProcessingResult}>(`/shipments/${activeShipmentId}/documents`,form);
      setProcessing(res.data);
    }catch(e){
      setUploadError(e instanceof ApiError?e.message:"Gagal mengunggah dokumen.");
    }finally{
      setUploading(false);
    }
  }

  function view(doc:ExportDocument){
    if(doc.fileUrl){window.open(fileUrl(doc.fileUrl)!,"_blank");return;}
    if(doc.generatedContent){const blob=new Blob([doc.generatedContent],{type:"text/plain;charset=utf-8"});window.open(URL.createObjectURL(blob),"_blank");}
  }

  const status=processing?.processingStatus;
  return <div className="figma-page">
    <header className="transaction-head"><div><h1 className="figma-heading">Document Assistant</h1><p className="figma-subtitle">Dokumen dan OCR dapat diuji sejak shipment dibuat—tidak perlu menunggu container match.</p></div><Link href="/documents/new" className="btn btn-primary"><Sparkles size={17}/> Buat Dokumen</Link></header>
    <section className="doc-layout"><div className="figma-card doc-table-card"><div className="figma-card-head"><h2>Dokumen Aktif</h2><span className="table-actions"><SlidersHorizontal size={18}/><Search size={18}/></span></div>{loading?<PageLoading/>:<table className="figma-table"><thead><tr><th>Jenis Dokumen</th><th>No. Referensi</th><th>Diperbarui</th><th>Pengaturan</th></tr></thead><tbody>{documents.map((d,i)=><tr key={d.id}><td><span className="doc-name"><span className="doc-small-icon"><FileText size={14}/></span>{d.typeLabel}</span></td><td>{d.status==="draft"?"Draft":`ID-2026-${String(i+1).padStart(3,"0")}`}</td><td>{formatDate(d.updatedAt)}</td><td><span className="table-actions"><button aria-label={`Unduh ${d.typeLabel}`} onClick={()=>view(d)} disabled={!d.fileUrl&&!d.generatedContent}><Download size={19}/></button>{d.type!=="UNCLASSIFIED"&&<Link href={`/documents/new/${d.type}`} aria-label={`Buat ulang ${d.typeLabel}`}><Edit3 size={19}/></Link>}</span></td></tr>)}</tbody></table>}</div><aside className="figma-card readiness"><h2>Checklist Kesiapan Ekspor</h2>{[["Registrasi Perusahaan (NIB)","Terverifikasi melalui OSS RBA","done"],["Harmonized System (HS) Codes","12 item telah dipetakan","done"],["Bukti Kepatuhan Regulasi","Menunggu verifikasi SKA","warn"],["Pengajuan PEB Final","Terkunci hingga verifikasi lengkap","disabled"]].map(([title,copy,state])=><div className={`ready-step ${state}`} key={title}><span className="ready-dot">{state==="done"?<Check size={13}/>:state==="warn"?"↯":<LockKeyhole size={11}/>}</span><div><h3>{title}</h3><p>{copy}</p></div></div>)}</aside></section>
    <section className="upload-figma" aria-labelledby="upload-title"><span className="upload-circle"><Upload size={23}/></span><h3 id="upload-title">{file?.name??"Uji OCR dan ekstraksi dokumen"}</h3><p>Pilih shipment termasuk yang masih menunggu match, lalu unggah dokumen sumber.<br/>Mendukung PDF, gambar, DOCX, XLSX, dan CSV hingga 25 MB.</p><div className="upload-controls"><div className="field"><label htmlFor="ocr-shipment">Pengiriman</label><select id="ocr-shipment" value={activeShipmentId} onChange={e=>setSelectedShipmentId(e.target.value)} disabled={shipmentsLoading||uploading}><option value="">{shipmentsLoading?"Memuat pengiriman...":"Pilih pengiriman"}</option>{shipments.map(s=><option key={s.id} value={s.id}>{s.id} — {s.destinationPort} ({shipmentLabels[s.status]??s.status})</option>)}</select></div><div className="field"><label htmlFor="ocr-type">Jenis dokumen (opsional)</label><select id="ocr-type" value={selectedType} onChange={e=>setSelectedType(e.target.value)} disabled={uploading}><option value="">Deteksi otomatis</option>{documentTypes.map(t=><option key={t.type} value={t.type}>{t.label}</option>)}</select></div><label className="btn btn-secondary upload-file-button"><input type="file" accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.docx,.xlsx,.csv" onChange={e=>setFile(e.target.files?.[0]??null)} disabled={uploading}/>Pilih berkas</label><button className="btn btn-primary" type="button" onClick={uploadDocument} disabled={!file||!activeShipmentId||uploading}>{uploading?"Mengunggah...":"Proses dokumen"}</button></div>{!shipmentsLoading&&shipments.length===0&&<p className="field-error">Buat pengiriman terlebih dahulu. Container match tidak diperlukan.</p>}{uploadError&&<p className="field-error">{uploadError}</p>}</section>
    {processing&&<section className="figma-card ocr-result"><div className="section-head"><div><h2 className="section-title">Hasil Document Intelligence</h2><p className="page-subtitle">{processing.fileName}</p></div>{status&&<span className={`badge ${status==="failed"?"danger":status==="completed"?"success":"info"}`}>{processingLabels[status]}</span>}</div><div className="meta-grid"><Meta label="Inspeksi file" value={processing.inspectionStatus??"—"}/><Meta label="Halaman" value={processing.pages!=null?String(processing.pages):"—"}/><Meta label="Text layer" value={processing.hasTextLayer==null?"—":processing.hasTextLayer?"Ada":"Tidak ada / memakai OCR"}/><Meta label="Klasifikasi" value={processing.classification.type??"Sedang dideteksi"}/><Meta label="Confidence klasifikasi" value={processing.classification.confidence!=null?`${Math.round(processing.classification.confidence*100)}%`:"—"}/><Meta label="Metode klasifikasi" value={processing.classification.method??"—"}/></div>{processing.error&&<p className="field-error">{processing.error}</p>}{status&&!terminalDocumentStatuses.has(status)&&<p className="page-subtitle ocr-polling">Status diperbarui otomatis selama OCR berjalan…</p>}{status&&terminalDocumentStatuses.has(status)&&status!=="failed"&&<div className="ocr-extractions"><h3>Field hasil ekstraksi ({extractions.length})</h3>{extractions.length===0?<p className="page-subtitle">Tidak ada field yang dikenali. Dokumen perlu ditinjau.</p>:<div className="table-wrap"><table className="figma-table"><thead><tr><th>Field</th><th>Nilai</th><th>Confidence</th><th>Sumber</th></tr></thead><tbody>{extractions.map(x=><tr key={x.id}><td><strong>{x.field}</strong></td><td>{x.value}{x.unit?` ${x.unit}`:""}</td><td>{Math.round(x.confidence*100)}%</td><td>{x.source.parser}{x.source.page!=null?` • halaman ${x.source.page}`:""}</td></tr>)}</tbody></table></div>}</div>}</section>}
  </div>
}
function DocumentDraft(){const groups=[{title:"Dokumen Legalitas",items:[{label:"Nomor Induk Berusaha",type:null},{label:"Sistem Verifikasi Legalitas Kayu",type:"SVLK"}]},{title:"Dokumen Pabean",items:[{label:"Surat Keterangan Asal",type:"CERTIFICATE_OF_ORIGIN"},{label:"Pemberitahuan Ekspor Barang",type:"PEB"}]},{title:"Dokumen Transaksi",items:[{label:"Invoice",type:"COMMERCIAL_INVOICE"},{label:"Packing List",type:"PACKING_LIST"}]},{title:"Dokumen Pengiriman",items:[{label:"Bill of Lading",type:"BILL_OF_LADING"}]}];return <div className="figma-page"><div className="breadcrumb"><Link href="/documents">Document Assistant</Link><ChevronRight size={20}/><strong>Buat Dokumen</strong></div><h1 className="figma-heading">Buat Dokumen</h1><p className="figma-subtitle">Buat dan verifikasi dokumen ekspormu dari Indonesia</p><div className="document-groups">{groups.map((group,g)=><section className="document-group" key={group.title}><h2>{group.title}</h2><div className="document-type-grid">{group.items.map((item,i)=>item.type?<Link key={item.label} href={`/documents/new/${item.type}`} className="document-type"><Image src="/document-types.png" width={78} height={78} alt="" className="document-illustration" style={{objectPosition:`${(g+i)%2?"right":"left"} ${(g>1)?"bottom":"top"}`}}/><span>{item.label}</span></Link>:<span key={item.label} className="document-type" style={{opacity:.5,cursor:"not-allowed"}} title="Terverifikasi otomatis, tidak perlu dibuat"><Image src="/document-types.png" width={78} height={78} alt="" className="document-illustration" style={{objectPosition:`${(g+i)%2?"right":"left"} ${(g>1)?"bottom":"top"}`}}/><span>{item.label}</span></span>)}</div></section>)}</div></div>}

function placeholderFor(key:string,s:Shipment):string|undefined{
  const lower=key.toLowerCase();
  if(lower.includes("exportername")||lower==="shippernameaddress"||lower==="shipfromnameaddress")return `${s.exporter.company}, ${s.exporter.address}`;
  if(lower.includes("importername")||lower.includes("consigneename")||lower==="shiptonameaddress")return `${s.consignee.company}, ${s.consignee.address}`;
  if(lower==="goodsdescription"||lower==="commoditydescription")return s.product.description;
  if(lower==="hscode")return s.product.hsCode;
  if(lower==="countryoforigin"||lower==="countryofmanufacture")return s.countryOfOrigin;
  if(lower==="certifyingcompany")return s.exporter.company;
  if(lower==="certifyingname")return s.exporter.name;
  if(lower==="certifyingrole")return "Exporter";
  if(lower==="certifyingtitle")return "Owner";
  if(lower==="companyname")return s.exporter.company;
  if(lower==="companyaddress")return s.exporter.address;
  if(lower.includes("weight"))return `${s.product.grossWeight} ${s.product.weightUnit}`;
  return undefined;
}
function DocumentField({id}:{id?:string}){
  const{data:schema,loading}=useDocumentSchema(id);
  const{data:shipments}=useShipments();
  const s=pickShipment(shipments);
  const[rowCount,setRowCount]=useState(1);
  const[trackedType,setTrackedType]=useState(id);
  if(id!==trackedType){setTrackedType(id);setRowCount(1);}
  const[drafted,setDrafted]=useState(false);
  const[submitting,setSubmitting]=useState(false);
  const[error,setError]=useState<string|null>(null);
  const[result,setResult]=useState<{fileUrl:string|null;generatedContent:string|null}|null>(null);
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!schema||!s)return;
    const f=new FormData(e.currentTarget);
    const fields:Record<string,string>={};
    schema.fields.forEach(fld=>{fields[fld.key]=String(f.get(fld.key)||"");});
    let items:Record<string,string>[]|undefined;
    if(schema.itemsSchema){
      items=[];
      for(let i=0;i<rowCount;i++){
        const row:Record<string,string>={};
        schema.itemsSchema.columns.forEach(col=>{row[col.key]=String(f.get(`row-${i}-${col.key}`)||"");});
        items.push(row);
      }
    }
    setSubmitting(true);setError(null);
    try{
      const res=await api.post<{data:{fileUrl:string|null;generatedContent:string|null}}>("/documents",{type:schema.type,shipmentId:s.id,fields,items});
      setResult(res.data);
      setDrafted(true);
    }catch(e){setError(e instanceof ApiError?e.message:"Gagal membuat dokumen.");}
    finally{setSubmitting(false);}
  }
  if(loading)return <PageLoading/>;
  if(!schema)return <ErrorNote message="Jenis dokumen tidak ditemukan."/>;
  if(!s)return <ErrorNote message="Buat pengiriman terlebih dahulu sebelum membuat dokumen."/>;
  const isSka=schema.type==="CERTIFICATE_OF_ORIGIN";
  const pageTitle=isSka?"Surat Keterangan Asal":schema.label;
  const cardTitle=isSka?"Surat Keterangan Asal (SKA)":schema.label;
  function view(){
    if(result?.fileUrl){window.open(fileUrl(result.fileUrl)!,"_blank");return;}
    if(result?.generatedContent){const blob=new Blob([result.generatedContent],{type:"text/plain;charset=utf-8"});window.open(URL.createObjectURL(blob),"_blank");}
  }
  return <div className="figma-page"><div className="breadcrumb"><Link href="/documents">Document Assistant</Link><ChevronRight size={20}/><Link href="/documents/new">Buat Dokumen</Link><ChevronRight size={20}/><strong>{pageTitle}</strong></div><h1 className="figma-heading">{pageTitle}</h1><p className="figma-subtitle">Buat dan verifikasi dokumen ekspormu dari Indonesia</p><form className="figma-card doc-field-card" onSubmit={submit}><h2>{cardTitle}</h2><p>Isi informasi di bawah ini untuk mendapatkan draft dokumenmu</p><div className="form-grid">{schema.fields.map(fld=><Field key={fld.key} name={fld.key} label={fld.required?`${fld.label} *`:fld.label} placeholder={placeholderFor(fld.key,s)}/>)}</div>{schema.itemsSchema&&<div className="figma-card" style={{marginTop:18,boxShadow:"none",background:"#f7f7ff"}}><div className="section-head"><h2 className="section-title">{schema.itemsSchema.label}</h2><button type="button" className="btn btn-ghost" onClick={()=>setRowCount(n=>n+1)}><Plus size={14}/> Tambah baris</button></div>{Array.from({length:rowCount}).map((_,i)=><div key={i} className="form-grid" style={{marginTop:i?18:0,paddingTop:i?18:0,borderTop:i?"1px solid var(--border)":undefined}}>{schema.itemsSchema!.columns.map(col=><Field key={col.key} name={`row-${i}-${col.key}`} label={col.required?`${col.label} *`:col.label} placeholder={placeholderFor(col.key,s)}/>)}{rowCount>1&&i===rowCount-1&&<button type="button" className="btn btn-ghost" onClick={()=>setRowCount(n=>n-1)}><Trash2 size={14}/> Hapus baris ini</button>}</div>)}</div>}{error&&<p className="field-error">{error}</p>}<div className="doc-field-actions"><button className="btn btn-primary" type="submit" disabled={submitting}><Sparkles size={17}/> {submitting?"Memproses...":"Create Document Draft"}</button><button className="btn btn-secondary" type="button" disabled={!drafted} onClick={view}><Download size={17}/> {drafted?"Review Draft":"Download Verified Document"}</button></div></form>{drafted&&<Toast message={`Draft ${schema.label} berhasil dibuat dan siap ditinjau.`}/>}</div>}

function PaymentsPage(){
  const{data:orders,loading}=useOrders();
  const{data:shipments}=useShipments();
  const[query,setQuery]=useState("");
  const shipmentCodeById=new Map(shipments.map(s=>[s.id,s.id]));
  const rows:Payment[]=orders.map(o=>mapOrderToPayment(o,shipmentCodeById.get(o.shipmentId??""))).filter(p=>(p.id+p.shipmentId+p.description).toLowerCase().includes(query.toLowerCase()));
  return <div className="figma-page"><header className="transaction-head"><div><h1 className="figma-heading">Riwayat Pembayaran</h1><p className="figma-subtitle">Kelola transaksi pembayaran ekspor Anda.</p></div><button className="btn btn-ghost"><FileDown size={16}/> Ekspor CSV</button></header><div className="figma-card transaction-filters"><label className="search"><Search size={18}/><span className="sr-only">Cari pembayaran</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari ID pembayaran, pengiriman..."/></label><select aria-label="Filter pembayaran" className="btn btn-ghost"><option>Semua status</option><option>Lunas</option><option>Deposit dibayar</option><option>Refund</option></select><div className="field"><input value="1 Jan – 31 Mar 2026" readOnly/></div></div>{loading?<PageLoading/>:<div className="figma-card transaction-card"><table className="figma-table"><thead><tr><th>ID Pembayaran</th><th>Tanggal</th><th>Pengiriman</th><th>Jumlah (IDR)</th><th>Status pembayaran</th><th>Aksi</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td>{p.id}</td><td>{formatDate(p.date)}</td><td><Link href={`/shipments/${p.shipmentId}`}>{p.shipmentId}</Link></td><td>{formatRupiah(p.amount)}</td><td><StatusBadge status={p.status}/></td><td><ChevronRight size={18}/></td></tr>)}</tbody></table><div className="transaction-pagination"><span>Menampilkan 1–{rows.length} dari {rows.length} entri</span><div className="pages"><button className="page-btn active">1</button></div></div></div>}</div>}

const paymentMethodMap={bank:"bank_transfer",card:"credit_card",wallet:"e_wallet"} as const;
function generateVaNumber(shipmentId:string):string{
  let hash=0;for(const ch of shipmentId)hash=(hash*31+ch.charCodeAt(0))>>>0;
  return `8808${String(hash).padStart(10,"0").slice(0,10)}`;
}
function formatCountdown(totalSeconds:number):string{const m=Math.floor(totalSeconds/60);const sec=totalSeconds%60;return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;}
const walletProviders={gopay:"GoPay",ovo:"OVO",shopeepay:"ShopeePay"} as const;
const WALLET_TARGET_NUMBER="081289899090";
function Checkout({id,containerId}:{id?:string;containerId?:string}){
  const{data:s,loading}=useShipment(id);
  const{data:containers}=useContainers(s?.cbm);
  const{data:chosenContainer}=useContainer(containerId,s?.cbm);
  const[method,setMethod]=useState<keyof typeof paymentMethodMap>("bank");
  const[stage,setStage]=useState<"idle"|"wallet"|"waiting"|"card"|"otp">("idle");
  const[remaining,setRemaining]=useState(300);
  const[toasted,setToasted]=useState(false);
  const[submitting,setSubmitting]=useState(false);
  const[error,setError]=useState<string|null>(null);
  const[formError,setFormError]=useState<string|null>(null);
  const[cardNumber,setCardNumber]=useState("");
  const[cvc,setCvc]=useState("");
  const[otp,setOtp]=useState("");
  const[walletProvider,setWalletProvider]=useState<keyof typeof walletProviders>("gopay");
  const container=chosenContainer??containers[0];
  async function confirmPay(){
    setSubmitting(true);setError(null);
    try{
      await api.post("/orders/checkout/confirm",{containerId:container!.id,volumeCbm:s!.cbm,paymentMethod:paymentMethodMap[method],shipmentId:s!.id});
      setStage("idle");setToasted(true);
    }catch(e){setError(e instanceof ApiError?e.message:"Gagal memproses pembayaran.");}
    finally{setSubmitting(false);}
  }
  useEffect(()=>{
    if(stage!=="waiting")return;
    const detectTimer=setTimeout(()=>{confirmPay();},Math.random()*120000);
    const tick=setInterval(()=>{setRemaining(r=>Math.max(0,r-1));},1000);
    return ()=>{clearTimeout(detectTimer);clearInterval(tick);};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[stage]);
  if(loading)return <PageLoading/>;
  if(!s)return <ErrorNote message="Pengiriman tidak ditemukan."/>;
  if(!container)return <ErrorNote message="Belum ada container yang tersedia untuk tujuan ini."/>;
  const costs=container.costs;
  function startPay(){setFormError(null);setError(null);if(method==="card"){setStage("card");}else if(method==="wallet"){setStage("wallet");}else{setRemaining(300);setStage("waiting");}}
  function confirmWalletProvider(){setFormError(null);setRemaining(300);setStage("waiting");}
  function submitCard(e:React.FormEvent){
    e.preventDefault();
    if(cardNumber.replace(/\s/g,"").length<12){setFormError("Nomor kartu tidak valid.");return;}
    if(!/^\d{3,4}$/.test(cvc)){setFormError("CVC tidak valid.");return;}
    setFormError(null);setStage("otp");
  }
  function submitOtp(e:React.FormEvent){
    e.preventDefault();
    if(!/^\d{6}$/.test(otp)){setFormError("Kode OTP harus 6 digit angka.");return;}
    setFormError(null);confirmPay();
  }
  return <div className="figma-page"><header><h1 className="figma-heading">Checkout</h1><p className="figma-subtitle">Tinjau detail pengiriman dan selesaikan pembayaran</p></header><div className="checkout-stack"><section className="figma-card checkout-summary"><div className="checkout-top"><div><h2>{s.destinationPort}, JP</h2><p>Estimasi keberangkatan: {formatDate(container.estimatedDeparture)}</p></div><span className="badge info">Consolidated LCL</span></div><div className="checkout-cost"><CostBreakdown costs={costs} cbm={s.cbm}/></div></section><section className="checkout-payments"><h2>Metode Pembayaran</h2>{([["bank",Landmark,"Transfer Bank","Tanpa biaya"],["card",CreditCard,"Kartu Kredit / Debit","+2,9% biaya"],["wallet",WalletCards,"E-Wallet","+1,5% biaya"]] as const).map(([key,Icon,label,fee])=><label className={`checkout-option ${method===key?"selected":""}`} key={key}><input type="radio" name="payment" checked={method===key} onChange={()=>setMethod(key)}/><Icon size={20} color="#041a6c"/><strong>{label}</strong><small>{fee}</small></label>)}</section><section className="figma-card checkout-confirm"><div className="checkout-due"><span>Total jatuh tempo</span><strong style={{fontSize:18,color:"#041a6c"}}>{formatRupiah(costs.total)}</strong></div>{error&&<p className="field-error">{error}</p>}<button className="btn btn-primary" style={{width:"100%",fontSize:17}} disabled={submitting} onClick={startPay}>Konfirmasi & Bayar <ArrowRight size={18}/></button><p className="secure-note"><LockKeyhole size={12} style={{display:"inline"}}/> Enkripsi SSL 256-bit yang aman</p></section></div>
  {stage==="wallet"&&<Modal title="Pilih E-Wallet" onClose={()=>setStage("idle")}><p className="page-subtitle">Pilih e-wallet untuk membayar <strong>{formatRupiah(costs.total)}</strong>.</p><div style={{display:"grid",gap:10,marginTop:14}}>{(Object.entries(walletProviders) as [keyof typeof walletProviders,string][]).map(([id,label])=><label className={`checkout-option ${walletProvider===id?"selected":""}`} key={id}><input type="radio" name="walletProvider" checked={walletProvider===id} onChange={()=>setWalletProvider(id)}/><strong>{label}</strong></label>)}</div><div className="card" style={{background:"#f7f7ff",boxShadow:"none",marginTop:14,textAlign:"center"}}><div className="meta-label">Nomor Tujuan Transfer</div><strong style={{fontSize:22,letterSpacing:1,color:"var(--navy-950)",display:"block",marginTop:6}}>{WALLET_TARGET_NUMBER}</strong></div>{error&&<p className="field-error">{error}</p>}<div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={()=>setStage("idle")}>Batal</button><button type="button" className="btn btn-primary" onClick={confirmWalletProvider}>Lanjutkan</button></div></Modal>}
  {stage==="waiting"&&<Modal title="Menunggu Pembayaran" onClose={()=>setStage("idle")}><p className="page-subtitle">{method==="bank"?<>Transfer sejumlah <strong>{formatRupiah(costs.total)}</strong> ke Virtual Account berikut dalam waktu 5 menit.</>:<>Selesaikan pembayaran sejumlah <strong>{formatRupiah(costs.total)}</strong> melalui <strong>{walletProviders[walletProvider]}</strong> ke nomor berikut dalam waktu 5 menit.</>}</p><div className="card" style={{background:"#f7f7ff",boxShadow:"none",marginTop:14,textAlign:"center"}}><div className="meta-label">{method==="bank"?"Virtual Account BCA":"Nomor Tujuan Transfer"}</div><strong style={{fontSize:22,letterSpacing:1,color:"var(--navy-950)",display:"block",marginTop:6}}>{method==="bank"?generateVaNumber(s.id):WALLET_TARGET_NUMBER}</strong></div><div className="card" style={{background:"#f7f7ff",boxShadow:"none",marginTop:14,textAlign:"center"}}><div className="meta-label">Sisa waktu pembayaran</div><strong style={{fontSize:28,color:"var(--navy-950)",display:"block",marginTop:6}}>{formatCountdown(remaining)}</strong><small style={{color:"var(--muted)"}}>Status pembayaran sedang diperiksa otomatis oleh sistem...</small></div>{error&&<p className="field-error" style={{marginTop:12}}>{error}</p>}<div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={()=>setStage("idle")}>Batal</button></div></Modal>}
  {stage==="card"&&<Modal title="Masukkan Detail Kartu" onClose={()=>setStage("idle")}><form onSubmit={submitCard}><p className="page-subtitle">Bayar <strong>{formatRupiah(costs.total)}</strong> menggunakan kartu kredit/debit Anda.</p><div className="form-grid" style={{marginTop:14}}><div className="field span-2"><label htmlFor="cardNumber">Nomor Kartu</label><input id="cardNumber" inputMode="numeric" value={cardNumber} onChange={e=>setCardNumber(e.target.value)} placeholder="4111 1111 1111 1111" required/></div><div className="field"><label htmlFor="cvc">CVC</label><input id="cvc" inputMode="numeric" value={cvc} onChange={e=>setCvc(e.target.value)} placeholder="123" required maxLength={4}/></div></div>{(formError||error)&&<p className="field-error">{formError||error}</p>}<div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={()=>setStage("idle")}>Batal</button><button type="submit" className="btn btn-primary">Lanjutkan</button></div></form></Modal>}
  {stage==="otp"&&<Modal title="Periksa Kode OTP dari Ponselmu" onClose={()=>setStage("idle")}><form onSubmit={submitOtp}><p className="page-subtitle">Masukkan kode OTP yang dikirim ke ponselmu untuk mengonfirmasi pembayaran sebesar <strong>{formatRupiah(costs.total)}</strong>.</p><div className="field" style={{marginTop:14}}><label htmlFor="otp">Kode OTP</label><input id="otp" inputMode="numeric" value={otp} onChange={e=>setOtp(e.target.value)} placeholder="123456" maxLength={6} required/></div>{(formError||error)&&<p className="field-error">{formError||error}</p>}<div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={()=>setStage("idle")}>Batal</button><button type="submit" className="btn btn-primary" disabled={submitting}>{submitting?"Memproses...":"Konfirmasi"}</button></div></form></Modal>}
  {toasted&&<Toast message="Pembayaran berhasil dikonfirmasi. Slot Anda sudah dibooking."/>}</div>}

function SupportPage(){const[toasted,setToasted]=useState(false);return <><PageHeader eyebrow="Bantuan ekspor" title="Ada yang bisa kami bantu?" subtitle="Hubungi account manager KUBO untuk matching, dokumen, atau proses pembayaran."/><section className="grid three-col"><article className="card feature"><UserRound size={28}/><h3>Dian Maharani</h3><p>Account Manager koridor Indonesia–Jepang<br/>Senin–Jumat, 08.00–17.00 WIB</p><button className="btn btn-primary" style={{marginTop:16}} onClick={()=>setToasted(true)}>Hubungi Dian</button></article><article className="card feature"><FileText size={28}/><h3>Bantuan dokumen</h3><p>Dapatkan panduan untuk memperbaiki draft, menyiapkan data, dan memahami status verifikasi.</p><Link className="btn btn-secondary" href="/documents" style={{marginTop:16}}>Buka dokumen</Link></article><article className="card feature"><CircleHelp size={28}/><h3>Pusat panduan</h3><p>Pelajari CBM, Cargo Ready Date, cut-off, Consolidated LCL, dan alur ekspor furniture.</p><button className="btn btn-secondary" style={{marginTop:16}}>Lihat panduan</button></article></section><section className="card section"><h2 className="section-title">Kirim pertanyaan</h2><form className="form-grid" style={{marginTop:18}} onSubmit={e=>{e.preventDefault();setToasted(true)}}><SelectField name="topic" label="Topik" options={["Matching container","Dokumen ekspor","Pembayaran","Pelacakan pengiriman"]}/><Field name="shipment" label="ID Pengiriman (opsional)" placeholder="KUB-24081"/><div className="field span-2"><label htmlFor="question">Pertanyaan</label><textarea id="question" required placeholder="Jelaskan kendala Anda..."/></div><button className="btn btn-primary" type="submit">Kirim ke tim bantuan</button></form></section>{toasted&&<Toast message="Pesan terkirim. Tim KUBO akan segera menghubungi Anda."/>}</>}

function SettingsPage(){
  const{user,refreshUser}=useAuth();
  const[toasted,setToasted]=useState(false);
  const[submitting,setSubmitting]=useState(false);
  const[error,setError]=useState<string|null>(null);
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setSubmitting(true);setError(null);
    try{
      const f=new FormData(e.currentTarget);
      const form=new FormData();
      form.set("name",String(f.get("owner")||""));
      form.set("businessName",String(f.get("company")||""));
      form.set("businessAddress",String(f.get("address")||""));
      await api.patch("/users/me",form);
      await refreshUser();
      setToasted(true);setTimeout(()=>setToasted(false),2500);
    }catch(e){setError(e instanceof ApiError?e.message:"Gagal menyimpan perubahan.");}
    finally{setSubmitting(false);}
  }
  return <><PageHeader eyebrow="Akun" title="Pengaturan" subtitle="Kelola profil usaha, notifikasi, dan preferensi ekspor."/><section className="grid two-col"><form className="card" onSubmit={submit}><h2 className="section-title">Profil usaha</h2><div className="form-grid" style={{marginTop:18}}><Field name="owner" label="Nama pemilik" placeholder={user?.name||"Raka Pradana"}/><Field name="company" label="Nama usaha" placeholder={user?.businessName||"CV Jepara Reka Kayu"}/><div className="field"><label>Email</label><input value={user?.email??""} disabled/></div><Field name="phone" label="Nomor WhatsApp" placeholder="+62 812 3456 7890"/><div className="field span-2"><label htmlFor="address">Alamat usaha</label><textarea id="address" name="address" defaultValue={user?.businessAddress||"Jl. Raya Tahunan 18, Jepara, Jawa Tengah"}/></div></div>{error&&<p className="field-error" style={{marginTop:12}}>{error}</p>}<button className="btn btn-primary" type="submit" disabled={submitting} style={{marginTop:20}}>{submitting?"Menyimpan...":"Simpan perubahan"}</button></form><aside className="card"><h2 className="section-title">Preferensi notifikasi</h2><div className="grid" style={{marginTop:18}}>{["Perubahan status pengiriman","Peluang matching baru","Tenggat dokumen","Pengingat pembayaran","Pesan Account Manager"].map((x,i)=><label className="check-row" key={x}><input type="checkbox" defaultChecked={i<4}/>{x}</label>)}</div><div className="card" style={{boxShadow:"none",marginTop:24,background:"#f7f7ff"}}><Settings size={20}/><p className="page-subtitle">Bahasa antarmuka: <strong>Bahasa Indonesia</strong><br/>Zona waktu: <strong>Asia/Jakarta</strong></p></div></aside></section>{toasted&&<Toast message="Pengaturan berhasil disimpan."/>}</>}

export default function AppPage({kind,id,containerId}:{kind:PageKind;id?:string;containerId?:string}){const page=useMemo(()=>{switch(kind){case"dashboard":return <DashboardPage/>;case"shipments":return <ShipmentsPage/>;case"shipment-detail":return <ShipmentDetail id={id}/>;case"matching":return <MatchingPage/>;case"match-detail":return <MatchDetail id={id}/>;case"documents":return <DocumentsPage/>;case"document-new":return <DocumentDraft/>;case"document-field":return <DocumentField id={id}/>;case"payments":return <PaymentsPage/>;case"checkout":return <Checkout id={id} containerId={containerId}/>;case"support":return <SupportPage/>;case"settings":return <SettingsPage/>;}},[kind,id,containerId]);const shell=<AppShell>{page}</AppShell>;return <RequireAuth>{kind==="settings"||kind==="support"?shell:<RoleGuard role="umkm">{shell}</RoleGuard>}</RequireAuth>}
