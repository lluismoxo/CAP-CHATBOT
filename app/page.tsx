import Chat from "@/components/Chat";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center bg-white">
      <header className="w-full border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-capblue flex items-center justify-center text-white font-bold tracking-tight">
              C
            </div>
            <div>
              <h1 className="text-base font-semibold text-black leading-tight">CAP Consultor</h1>
              <p className="text-xs text-neutral-500">Consultoría adaptativa para pymes</p>
            </div>
          </div>
          <a
            href="https://capconsultor.eu/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-capblue hover:underline"
          >
            capconsultor.eu →
          </a>
        </div>
      </header>

      <section className="w-full flex-1 flex flex-col">
        <div className="max-w-3xl w-full mx-auto px-4 py-6 flex-1 flex flex-col">
          <Chat />
        </div>
      </section>

      <footer className="w-full border-t border-neutral-200 mt-4">
        <div className="max-w-3xl mx-auto px-6 py-3 text-[11px] text-neutral-400 flex justify-between">
          <span>© CAP Consultor · Barcelona</span>
          <span>contact@capconsultor.eu</span>
        </div>
      </footer>
    </main>
  );
}
