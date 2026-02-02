import { ChatProvider } from "@/components/chat";

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <ChatProvider />
    </main>
  );
}
