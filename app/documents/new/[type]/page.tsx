import { DocumentGenerationScreen } from "@/components/documents/DocumentAssistant";
import type { ApiDocumentType } from "@/lib/api-types";

export default async function Page({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  return <DocumentGenerationScreen type={type as ApiDocumentType} />;
}
