import { CustomerOrderDetails } from "@/components/customer-dashboard/CustomerOrderDetails";

export default async function CustomerOrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <CustomerOrderDetails orderId={orderId} />;
}
