import AppPage from "@/components/AppPage";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ shipmentId: string }>;
  searchParams: Promise<{ containerId?: string }>;
}) {
  const { shipmentId } = await params;
  const { containerId } = await searchParams;
  return <AppPage kind="checkout" id={shipmentId} containerId={containerId} />;
}
