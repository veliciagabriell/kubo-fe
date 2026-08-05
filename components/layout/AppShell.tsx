"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bell, FileText, LayoutDashboard, LogOut, Menu, PackageOpen, Search, Settings, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

function initials(name?: string) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "??";
}

const nav = [
  { href:"/dashboard",label:"Dashboard",icon:LayoutDashboard },
  { href:"/documents",label:"Dokumen",icon:FileText },
  { href:"/matching",label:"Matching",icon:PackageOpen },
];
export function Brand(){return <Link href="/" className="brand" aria-label="KUBO Beranda"><Image src="/kubo-logo.png" width={141} height={79} alt="KUBO — Export Together, Grow Further" className="brand-image" priority/></Link>}
export function AppSidebar({ open, onClose }:{open:boolean;onClose:()=>void}){const path=usePathname();const{user,logout}=useAuth();return <aside className={`sidebar ${open?"open":""}`} aria-label="Navigasi utama"><div style={{display:"flex",justifyContent:"space-between"}}><Brand/><button className="icon-button md:hidden" onClick={onClose} aria-label="Tutup menu"><X size={18}/></button></div><nav className="nav-list">{nav.map(({href,label,icon:Icon})=><Link key={href} href={href} onClick={onClose} className={`nav-link ${path===href||path.startsWith(href+"/")?"active":""}`}><Icon size={18}/>{label}</Link>)}</nav><div className="sidebar-bottom"><Link href="/settings" className={`nav-link ${path==="/settings"?"active":""}`}><Settings size={18}/> Pengaturan</Link>{user&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"10px 12px",fontSize:12}}><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={user.name}>{initials(user.name)} · {user.name}</span><button type="button" className="icon-button" aria-label="Keluar" title="Keluar" onClick={logout}><LogOut size={16}/></button></div>}</div></aside>}
export function TopNavigation(){return <div className="top-nav"><div/><div className="top-nav-actions"><label className="search"><Search size={18}/><span className="sr-only">Cari</span><input placeholder="Cari pengiriman, dokumen, atau matching..."/></label><button className="icon-button" aria-label="Notifikasi"><Bell size={18}/></button><button className="icon-button" aria-label="Profil Raka Pradana" style={{background:"#223382",color:"white",fontWeight:800}}>RP</button></div></div>}
export function MobileBottomNavigation(){const path=usePathname();return <nav className="mobile-bottom" aria-label="Navigasi seluler" style={{gridTemplateColumns:"repeat(3,1fr)"}}>{nav.map(({href,label,icon:Icon})=><Link key={href} href={href} className={path.startsWith(href)?"active":""}><Icon size={19}/><span>{label}</span></Link>)}</nav>}
export default function AppShell({children}:{children:React.ReactNode}){const[open,setOpen]=useState(false);return <div className="app-shell"><div className="mobile-top"><button className="icon-button" onClick={()=>setOpen(true)} aria-label="Buka menu"><Menu size={20}/></button><Brand/><button className="icon-button" aria-label="Notifikasi"><Bell size={18}/></button></div>{open&&<button aria-label="Tutup menu" onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,background:"rgba(4,26,108,.3)",border:0,zIndex:39}}/>}<AppSidebar open={open} onClose={()=>setOpen(false)}/><main className="main-area">{children}</main><MobileBottomNavigation/></div>}
