"use client";

import { useEffect, useState } from "react";

export default function Feed() {
  const [events,setEvents]=useState([]);

  useEffect(()=>{
    fetch("/api/feed?chatId=1")
      .then(r=>r.json())
      .then(setEvents);
  },[]);

  return (
    <div>
      {events.map(e=>(
        <div key={e.id}>
          <h2>{e.title}</h2>
        </div>
      ))}
    </div>
  );
}
