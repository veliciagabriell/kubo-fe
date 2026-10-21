import { DocumentCheckScreen } from "@/components/documents/DocumentWorkflow";
export default async function Page({
  params,
}: {
  params: Promise<{ shipmentId: string }>;
}) {
  const { shipmentId } = await params;
  return <DocumentCheckScreen shipmentId={shipmentId} />;
}
