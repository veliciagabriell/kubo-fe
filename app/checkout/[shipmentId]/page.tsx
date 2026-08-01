import AppPage from "@/components/AppPage";
export default async function Page({params}:{params:Promise<{shipmentId:string}>}){const{shipmentId}=await params;return <AppPage kind="checkout" id={shipmentId}/>}
