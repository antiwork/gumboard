import { Note as NoteType } from "@/components/note";
import { Note } from "@/components/note";
import { useRef, useEffect, useState } from "react";

interface OffscreenNoteProps {
  note: NoteType;
  onHeightReady: (height: number) => void;
}

export function OffscreenNote({ note, onHeightReady }: OffscreenNoteProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const newHeight = ref.current.clientHeight;
      if (newHeight !== height) {
        setHeight(newHeight);
        onHeightReady(newHeight);
      }
    }
  }, [ref, height, onHeightReady]);

  return (
    <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
      <div ref={ref} style={{ width: "250px" }}>
        <Note note={note} />
      </div>
    </div>
  );
}
