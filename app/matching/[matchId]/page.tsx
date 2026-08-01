import AppPage from "@/components/AppPage";
export default async function Page({params}:{params:Promise<{matchId:string}>}){const{matchId}=await params;return <AppPage kind="match-detail" id={matchId}/>}
