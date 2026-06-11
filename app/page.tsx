import Chat from "@/components/Chat";

export default function Home() {
  return (
    <main className="h-screen flex flex-col bg-white overflow-hidden">
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto px-3 py-3 min-h-0">
        <Chat />
      </div>
    </main>
  );
}
