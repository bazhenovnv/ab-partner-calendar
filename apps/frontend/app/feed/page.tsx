"use client";

import { useEffect, useState } from "react";

type Event = {
  id: number;
  title: string;
};

export default function Feed() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetch("/api/feed?chatId=1")
      .then((r) => r.json())
      .then(setEvents);
  }, []);

  return (
    <div>
      {events.map((e) => (
        <div key={e.id}>
          <h2>{e.title}</h2>
        </div>
      ))}
    </div>
  );
}
