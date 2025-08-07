"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { StickyNoteCard, type Note } from "@/components/sticky-note-card"
import { Plus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const initialNotes: Note[] = [
  {
    id: 1,
    author: { name: "Sahil", initial: "S" },
    color: "bg-green-200/70",
    tasks: [
      { id: 101, text: "Gumboard release by Friday", completed: false },
      { id: 102, text: "Finance update by Friday", completed: false },
      { id: 103, text: "Jacquez", completed: true },
    ],
  },
  {
    id: 2,
    author: { name: "Michelle", initial: "M" },
    color: "bg-purple-200/60",
    tasks: [
      { id: 201, text: "Helper Tix (Mon-Fri)", completed: false },
      { id: 202, text: "Active Refunds (2x a week)", completed: false },
      { id: 203, text: "Card Tester Metabase (DAILY)", completed: true },
    ],
  },
  {
    id: 3,
    author: { name: "Steve", initial: "S" },
    color: "bg-blue-200/60",
    tasks: [
      { id: 301, text: "Review support huddle", completed: false },
      { id: 302, text: "Metabase queries", completed: false },
    ],
  },
  {
    id: 4,
    author: { name: "Daniel", initial: "D" },
    color: "bg-pink-200/70",
    tasks: [
      { id: 401, text: "Fixed unnecessary description", completed: false },
      { id: 402, text: "PR reviews", completed: true },
    ],
  },
]

const noteColors = ["bg-yellow-200/70", "bg-teal-200/70", "bg-orange-200/70"]
const authors = [
  { name: "Aaron", initial: "A" },
  { name: "Abdul", initial: "A" },
  { name: "Abhishek", initial: "A" },
  { name: "Adriano", initial: "A" },
  { name: "Ahmad", initial: "A" },
  { name: "Ahmed", initial: "A" },
  { name: "Akshay", initial: "A" },
  { name: "Al", initial: "A" },
  { name: "Alberto", initial: "A" },
  { name: "Alex", initial: "A" },
  { name: "Alexandra", initial: "A" },
  { name: "Álvaro", initial: "Á" },
  { name: "Amir", initial: "A" },
  { name: "Ananya", initial: "A" },
  { name: "Anchit", initial: "A" },
  { name: "Andie", initial: "A" },
  { name: "Andrés", initial: "A" },
  { name: "Andrew", initial: "A" },
  { name: "Anish", initial: "A" },
  { name: "Anshul", initial: "A" },
  { name: "Antônio", initial: "A" },
  { name: "Arpit", initial: "A" },
  { name: "Arun", initial: "A" },
  { name: "Avinash", initial: "A" },
  { name: "Ayush", initial: "A" },
  { name: "Ayrton", initial: "A" },
  { name: "Ben", initial: "B" },
  { name: "Benjamin", initial: "B" },
  { name: "Biresh", initial: "B" },
  { name: "Björn", initial: "B" },
  { name: "Bryan", initial: "B" },
  { name: "Byeonggi", initial: "B" },
  { name: "Carlos", initial: "C" },
  { name: "Chai", initial: "C" },
  { name: "Chinmoy", initial: "C" },
  { name: "Chris", initial: "C" },
  { name: "Christophe", initial: "C" },
  { name: "Ciocanel", initial: "C" },
  { name: "Cláudia", initial: "C" },
  { name: "Cody", initial: "C" },
  { name: "Cole", initial: "C" },
  { name: "Colin", initial: "C" },
  { name: "Connor", initial: "C" },
  { name: "Curtis", initial: "C" },
  { name: "Dane", initial: "D" },
  { name: "Daniel", initial: "D" },
  { name: "David", initial: "D" },
  { name: "Dejan", initial: "D" },
  { name: "Devanand", initial: "D" },
  { name: "Dombi", initial: "D" },
  { name: "Donald", initial: "D" },
  { name: "Edgar", initial: "E" },
  { name: "Elvio", initial: "E" },
  { name: "Emily", initial: "E" },
  { name: "Emmiliese", initial: "E" },
  { name: "Emmanuel", initial: "E" },
  { name: "Ershad", initial: "E" },
  { name: "Ertuğrul", initial: "E" },
  { name: "Esimit", initial: "E" },
  { name: "Ethan", initial: "E" },
  { name: "Eva", initial: "E" },
  { name: "Francisco", initial: "F" },
  { name: "Fred", initial: "F" },
  { name: "Gabriela", initial: "G" },
  { name: "Gaston", initial: "G" },
  { name: "Gaurav", initial: "G" },
  { name: "Gerry", initial: "G" },
  { name: "Gosha", initial: "G" },
  { name: "Grady", initial: "G" },
  { name: "Greg", initial: "G" },
  { name: "Gustavo", initial: "G" },
  { name: "Hanaffi", initial: "H" },
  { name: "Harbaksh", initial: "H" },
  { name: "Harshith", initial: "H" },
  { name: "Haseeb", initial: "H" },
  { name: "Heimark", initial: "H" },
  { name: "Helen", initial: "H" },
  { name: "Hide", initial: "H" },
  { name: "Ian", initial: "I" },
  { name: "Ikko", initial: "I" },
  { name: "Ira", initial: "I" },
  { name: "Jack", initial: "J" },
  { name: "Jake", initial: "J" },
  { name: "Jarren", initial: "J" },
  { name: "Jason", initial: "J" },
  { name: "Jessica", initial: "J" },
  { name: "Jevin", initial: "J" },
  { name: "Joel", initial: "J" },
  { name: "John", initial: "J" },
  { name: "Jona", initial: "J" },
  { name: "Jonas", initial: "J" },
  { name: "Jono", initial: "J" },
  { name: "Jordan", initial: "J" },
  { name: "Josef", initial: "J" },
  { name: "Josh", initial: "J" },
  { name: "Karan", initial: "K" },
  { name: "Kate", initial: "K" },
  { name: "Kathleen", initial: "K" },
  { name: "Katsuya", initial: "K" },
  { name: "Kavian", initial: "K" },
  { name: "Konrad", initial: "K" },
  { name: "Kris", initial: "K" },
  { name: "Kyle", initial: "K" },
  { name: "Laura", initial: "L" },
  { name: "Lauren", initial: "L" },
  { name: "Laurence", initial: "L" },
  { name: "Leigh", initial: "L" },
  { name: "Leo", initial: "L" },
  { name: "Leon", initial: "L" },
  { name: "Lewis", initial: "L" },
  { name: "Luis", initial: "L" },
  { name: "Luki", initial: "L" },
  { name: "Lyubomir", initial: "L" },
  { name: "Maddie", initial: "M" },
  { name: "Manuel", initial: "M" },
  { name: "Marcia", initial: "M" },
  { name: "Matan-Paul", initial: "M" },
  { name: "Matt", initial: "M" },
  { name: "Matthew", initial: "M" },
  { name: "Maxwell", initial: "M" },
  { name: "Maya", initial: "M" },
  { name: "Michael", initial: "M" },
  { name: "Michał", initial: "M" },
  { name: "Michelle", initial: "M" },
  { name: "Mike", initial: "M" },
  { name: "Mitchell", initial: "M" },
  { name: "Nicholas", initial: "N" },
  { name: "Nick", initial: "N" },
  { name: "Nicole", initial: "N" },
  { name: "Nikhil", initial: "N" },
  { name: "Noël", initial: "N" },
  { name: "Paul", initial: "P" },
  { name: "Paulius", initial: "P" },
  { name: "Pavan", initial: "P" },
  { name: "Philip", initial: "P" },
  { name: "Pratik", initial: "P" },
  { name: "Praveen", initial: "P" },
  { name: "Punit", initial: "P" },
  { name: "Quinn", initial: "Q" },
  { name: "Rafael", initial: "R" },
  { name: "Rahul", initial: "R" },
  { name: "Rajat", initial: "R" },
  { name: "Raphael", initial: "R" },
  { name: "Raul", initial: "R" },
  { name: "Razvan", initial: "R" },
  { name: "Renuka", initial: "R" },
  { name: "Richard", initial: "R" },
  { name: "Rob", initial: "R" },
  { name: "Robert", initial: "R" },
  { name: "Rohit", initial: "R" },
  { name: "Ruthie", initial: "R" },
  { name: "Ryan", initial: "R" },
  { name: "Saarthak", initial: "S" },
  { name: "Sagi", initial: "S" },
  { name: "Sahil", initial: "S" },
  { name: "Sam", initial: "S" },
  { name: "Sankalp", initial: "S" },
  { name: "Sashank", initial: "S" },
  { name: "Scott", initial: "S" },
  { name: "Seth", initial: "S" },
  { name: "Shan", initial: "S" },
  { name: "Sharang", initial: "S" },
  { name: "Sherry", initial: "S" },
  { name: "Shifa", initial: "S" },
  { name: "Sid", initial: "S" },
  { name: "Siddharth", initial: "S" },
  { name: "Sidharth", initial: "S" },
  { name: "Sijin", initial: "S" },
  { name: "Sri", initial: "S" },
  { name: "Sriram", initial: "S" },
  { name: "Srividhya", initial: "S" },
  { name: "Stanislav", initial: "S" },
  { name: "Steve", initial: "S" },
  { name: "Suman", initial: "S" },
  { name: "Sushil", initial: "S" },
  { name: "Tauseef", initial: "T" },
  { name: "Tekeste", initial: "T" },
  { name: "Terry", initial: "T" },
  { name: "Thad", initial: "T" },
  { name: "Thiago", initial: "T" },
  { name: "Tim", initial: "T" },
  { name: "Tom", initial: "T" },
  { name: "Tuhin", initial: "T" },
  { name: "Tushar", initial: "T" },
  { name: "Vatsal", initial: "V" },
  { name: "Victor", initial: "V" },
  { name: "Vip", initial: "V" },
  { name: "Vipul", initial: "V" },
  { name: "Vishal", initial: "V" },
  { name: "Wells", initial: "W" },
  { name: "Wiktor", initial: "W" },
  { name: "Wildan", initial: "W" },
  { name: "Wisen", initial: "W" },
  { name: "Yu-Hung", initial: "Y" },
  { name: "Zeta", initial: "Z" },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
}

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
}

export function StickyNotesDemo() {
  const [notes, setNotes] = useState<Note[]>(initialNotes)

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes(notes.map((note) => (note.id === updatedNote.id ? updatedNote : note)))
  }

  const handleDeleteNote = (noteId: number) => {
    setNotes(notes.filter((note) => note.id !== noteId))
  }

  const handleAddNote = () => {
    const randomColor = noteColors[Math.floor(Math.random() * noteColors.length)]
    const randomAuthor = authors[Math.floor(Math.random() * authors.length)]
    const newNote: Note = {
      id: Date.now(),
      author: randomAuthor,
      color: randomColor,
      tasks: [{ id: Date.now() + 1, text: "New to-do", completed: false }],
    }
    setNotes([newNote, ...notes])
  }

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
              <motion.div key={note.id} className="mb-4 break-inside-avoid" variants={itemVariants} exit="exit" layout>
                <StickyNoteCard note={note} onUpdate={handleUpdateNote} onDelete={handleDeleteNote} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
