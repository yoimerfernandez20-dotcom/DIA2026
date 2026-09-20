"use client";
import { useState } from "react";
import { useAlbaranes } from "@/lib/store";
import AlbaranList from "./AlbaranList";
import ImportAlbaran from "./ImportAlbaran";
import ScanScreen from "./ScanScreen";

type View = { name: "list" } | { name: "import" } | { name: "scan"; id: string };

export default function App() {
  const { albaranes, ready, upsert, remove } = useAlbaranes();
  const [view, setView] = useState<View>({ name: "list" });

  if (view.name === "import") {
    return (
      <ImportAlbaran
        onCancel={() => setView({ name: "list" })}
        onSave={(a) => {
          upsert(a);
          setView({ name: "scan", id: a.id });
        }}
      />
    );
  }

  if (view.name === "scan") {
    const albaran = albaranes.find((a) => a.id === view.id);
    if (albaran) {
      return <ScanScreen albaran={albaran} onChange={upsert} onBack={() => setView({ name: "list" })} />;
    }
  }

  return (
    <AlbaranList
      albaranes={albaranes}
      ready={ready}
      onNew={() => setView({ name: "import" })}
      onOpen={(id) => setView({ name: "scan", id })}
      onDelete={remove}
    />
  );
}
