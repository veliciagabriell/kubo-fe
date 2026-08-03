import AppPage from "@/components/AppPage";
export default async function Page({params}:{params:Promise<{type:string}>}){const{type}=await params;return <AppPage kind="document-field" id={type}/>}
