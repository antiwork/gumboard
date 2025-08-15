"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Note as NoteComponent } from "@/components/note";
import type { Note } from "@/components/note";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const initialNotes: Note[] = [
  {
    id: "1",
    color: "bg-green-200/70",
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    boardId: "demo-board",
    user: {
      id: "demo-user",
      name: "Sahil",
      email: "sahil@example.com",
    },
    checklistItems: [
      { id: "101", content: "Gumboard release by Friday", checked: false, order: 0 },
      { id: "102", content: "Finance update by Friday", checked: false, order: 1 },
      { id: "103", content: "Jacquez", checked: true, order: 2 },
    ],
  },
  {
    id: "2",
    color: "bg-purple-200/60",
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    boardId: "demo-board",
    user: {
      id: "demo-user",
      name: "Michelle",
      email: "michelle@example.com",
    },
    checklistItems: [
      { id: "201", content: "Helper Tix (Mon-Fri)", checked: false, order: 0 },
      { id: "202", content: "Active Refunds (2x a week)", checked: false, order: 1 },
      { id: "203", content: "Card Tester Metabase (DAILY)", checked: true, order: 2 },
    ],
  },
  {
    id: "3",
    color: "bg-blue-200/60",
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    boardId: "demo-board",
    user: {
      id: "demo-user",
      name: "Steve",
      email: "steve@example.com",
    },
    checklistItems: [
      { id: "301", content: "Review support huddle", checked: false, order: 0 },
      { id: "302", content: "Metabase queries", checked: false, order: 1 },
    ],
  },
  {
    id: "4",
    color: "bg-pink-200/70",
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    boardId: "demo-board",
    user: {
      id: "demo-user",
      name: "Daniel",
      email: "daniel@example.com",
    },
    checklistItems: [
      { id: "401", content: "Fixed unnecessary description", checked: false, order: 0 },
      { id: "402", content: "PR reviews", checked: true, order: 1 },
    ],
  },
];

const noteColors = ["bg-yellow-200/70", "bg-teal-200/70", "bg-orange-200/70"];

const generateRandomName = () => {
  const authors = [
    "Aaron",
    "Abdul",
    "Abhishek",
    "Adriano",
    "Ahmad",
    "Ahmed",
    "Akshay",
    "Al",
    "Alberto",
    "Alex",
    "Alexandra",
    "Álvaro",
    "Amir",
    "Ananya",
    "Anchit",
    "Andie",
    "Andrés",
    "Andrew",
    "Anish",
    "Anshul",
    "Antônio",
    "Arpit",
    "Arun",
    "Avinash",
    "Ayush",
    "Ayrton",
    "Ben",
    "Benjamin",
    "Biresh",
    "Björn",
    "Bryan",
    "Byeonggi",
    "Carlos",
    "Chai",
    "Chinmoy",
    "Chris",
    "Christophe",
    "Ciocanel",
    "Cláudia",
    "Cody",
    "Cole",
    "Colin",
    "Connor",
    "Curtis",
    "Dane",
    "Daniel",
    "David",
    "Dejan",
    "Devanand",
    "Dombi",
    "Donald",
    "Edgar",
    "Elvio",
    "Emily",
    "Emmiliese",
    "Emmanuel",
    "Ershad",
    "Ertuğrul",
    "Esimit",
    "Ethan",
    "Eva",
    "Francisco",
    "Fred",
    "Gabriela",
    "Gaston",
    "Gaurav",
    "Gerry",
    "Gosha",
    "Grady",
    "Greg",
    "Gustavo",
    "Hanaffi",
    "Harbaksh",
    "Harshith",
    "Haseeb",
    "Heimark",
    "Helen",
    "Hide",
    "Ian",
    "Ikko",
    "Ira",
    "Jack",
    "Jake",
    "Jarren",
    "Jason",
    "Jessica",
    "Jevin",
    "Joel",
    "John",
    "Jona",
    "Jonas",
    "Jono",
    "Jordan",
    "Josef",
    "Josh",
    "Karan",
    "Kate",
    "Kathleen",
    "Katsuya",
    "Kavian",
    "Konrad",
    "Kris",
    "Kyle",
    "Laura",
    "Lauren",
    "Laurence",
    "Leigh",
    "Leo",
    "Leon",
    "Lewis",
    "Luis",
    "Luki",
    "Lyubomir",
    "Maddie",
    "Manuel",
    "Marcia",
    "Matan-Paul",
    "Matt",
    "Matthew",
    "Maxwell",
    "Maya",
    "Michael",
    "Michał",
    "Michelle",
    "Mike",
    "Mitchell",
    "Nicholas",
    "Nick",
    "Nicole",
    "Nikhil",
    "Noël",
    "Paul",
    "Paulius",
    "Pavan",
    "Philip",
    "Pratik",
    "Praveen",
    "Punit",
    "Quinn",
    "Rafael",
    "Rahul",
    "Rajat",
    "Raphael",
    "Raul",
    "Razvan",
    "Renuka",
    "Richard",
    "Rob",
    "Robert",
    "Rohit",
    "Ruthie",
    "Ryan",
    "Saarthak",
    "Sagi",
    "Sahil",
    "Sam",
    "Sankalp",
    "Sashank",
    "Scott",
    "Seth",
    "Shan",
    "Sharang",
    "Sherry",
    "Shifa",
    "Sid",
    "Siddharth",
    "Sidharth",
    "Sijin",
    "Sri",
    "Sriram",
    "Srividhya",
    "Stanislav",
    "Steve",
    "Suman",
    "Sushil",
    "Tauseef",
    "Tekeste",
    "Terry",
    "Thad",
    "Thiago",
    "Tim",
    "Tom",
    "Tuhin",
    "Tushar",
    "Vatsal",
    "Victor",
    "Vip",
    "Vipul",
    "Vishal",
    "Wells",
    "Wiktor",
    "Wildan",
    "Wisen",
    "Yu-Hung",
    "Zeta",
  ];
  return authors[Math.floor(Math.random() * authors.length)];
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

export function StickyNotesDemo() {
  const [notes, setNotes] = useState<Note[]>(initialNotes);

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes(notes.map((note) => (note.id === updatedNote.id ? updatedNote : note)));
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter((note) => note.id !== noteId));
  };

  const handleAddNote = () => {
    const randomColor = noteColors[Math.floor(Math.random() * noteColors.length)];
    const name = generateRandomName();
    const randomAuthor = { name, initial: name.charAt(0) };
    const newNote: Note = {
      id: `${Date.now()}`,
      color: randomColor,
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      boardId: "demo-board",
      user: {
        id: "demo-user",
        name: randomAuthor.name,
        email: `${randomAuthor.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
      },
      checklistItems: [{ id: `${Date.now() + 1}`, content: "New to-do", checked: false, order: 0 }],
    };
    setNotes([newNote, ...notes]);
  };

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-end">
        <Button size="sm" onClick={handleAddNote}>
          <Plus className="mr-2 h-4 w-4" />
          Add Note
        </Button>
      </div>
      <div>
        <motion.div
          className="columns-1 gap-4 sm:columns-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence>
            {notes.map((note) => (
              <motion.div
                key={note.id}
                className="mb-4 break-inside-avoid"
                variants={itemVariants}
                exit="exit"
                layout
              >
                <div className="pb-4">
                  <NoteComponent
                    className={`${note.color} bg-white dark:bg-zinc-900 p-4`}
                    note={note}
                    currentUser={{ id: "demo-user", name: "Demo User", email: "demo@example.com" }}
                    onUpdate={handleUpdateNote}
                    onDelete={handleDeleteNote}
                    syncDB={false}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
