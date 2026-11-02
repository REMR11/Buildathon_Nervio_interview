import Link from "next/link";
import { StatusScreen } from "@/components/layout/status-screen";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <StatusScreen
      eyebrow="404"
      title="Página no encontrada"
      description="La página que buscas no existe o fue movida."
    >
      <Button render={<Link href="/" />}>Volver al inicio</Button>
      <Button variant="outline" render={<Link href="/interview/setup" />}>
        Practicar entrevista
      </Button>
    </StatusScreen>
  );
}
