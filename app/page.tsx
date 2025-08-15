import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { StickyNote, Users, Building2 } from "lucide-react";
import { StickyNotesDemo } from "@/components/sticky-notes-demo";
import { StatsSection } from "@/components/stats-section";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { BetaBadge } from "@/components/ui/beta-badge";

const features = [
  {
    icon: StickyNote,
    title: "Sticky notes & tasks",
    description:
      "Create colorful sticky notes with interactive checklists to track your team's progress.",
    iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: Users,
    title: "Real-time collaboration",
    description:
      "Work together seamlessly with your team in real-time. See updates instantly as they happen.",
    iconBgColor: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400",
  },
  {
    icon: Building2,
    title: "Organization management",
    description:
      "Invite team members, manage permissions, and keep your workspace organized across projects.",
    iconBgColor: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
];

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="flex-1">
        <section className="w-full py-12 md:py-15">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16 xl:gap-24">
              <div className="flex flex-col justify-center space-y-6 lg:mt-14">
                <div className="flex items-center gap-3">
                  <Image src="/logo/gumboard.svg" alt="Gumboard" width={50} height={50} />
                  <span className="text-4xl font-bold">Gumboard</span>
                  <BetaBadge />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Keep on top of your team&apos;s to-dos.
                  </h1>
                  <p className="max-w-[600px] text-slate-600 md:text-xl dark:text-zinc-300">
                    Gumboard is the free, real-time sticky note board that helps your team stay
                    aligned. Try the interactive demo—add notes, edit text, and complete tasks.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-100"
                  >
                    <Link href="/auth/signin">Get started - it&apos;s free</Link>
                  </Button>
                </div>
              </div>
              <StickyNotesDemo />
            </div>
          </div>
        </section>

        <section className="w-full py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
                Everything you need to stay organized
              </h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto dark:text-zinc-300">
                Gumboard brings your team together with powerful collaboration tools designed for
                modern workflows.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {features.map((feature) => {
                const IconComponent = feature.icon;
                return (
                  <Card
                    key={feature.title}
                    className="text-center dark:bg-zinc-900 dark:border-zinc-800"
                  >
                    <CardContent>
                      <div
                        className={`w-12 h-12 mx-auto mb-4 ${feature.iconBgColor} rounded-lg flex items-center justify-center`}
                      >
                        <IconComponent className={`h-6 w-6 ${feature.iconColor}`} />
                      </div>
                      <CardTitle className="mb-2">{feature.title}</CardTitle>
                      <CardDescription className="dark:text-zinc-300">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <StatsSection />
      </main>
      <footer className="w-full border-t border-slate-200 py-6 dark:border-zinc-800">
        <div className="container mx-auto text-center text-sm text-slate-600 dark:text-zinc-400">
          A project by{" "}
          <Link
            href="https://antiwork.com"
            className="underline hover:text-slate-900 dark:hover:text-zinc-100"
            target="_blank"
            rel="noopener noreferrer"
          >
            Antiwork
          </Link>
          {" • "}
          <Link
            href="https://github.com/antiwork/gumboard"
            className="underline hover:text-slate-900 dark:hover:text-zinc-100"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </Link>
        </div>
      </footer>
    </div>
  );
}
