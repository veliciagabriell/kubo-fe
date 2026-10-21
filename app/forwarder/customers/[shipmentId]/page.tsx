import { ForwarderCustomerDetailPage } from "@/components/forwarder/ForwarderWorkspace";
export default async function Page({
  params,
}: {
  params: Promise<{ shipmentId: string }>;
}) {
  const { shipmentId } = await params;
  return <ForwarderCustomerDetailPage shipmentId={shipmentId} />;
}
