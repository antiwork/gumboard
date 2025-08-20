"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { pl } from "date-fns/locale";
import { Check, Loader2 } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "per month",
    description: "For individuals or small teams getting started",
    features: [
      "Up to 2 members",
      "Unlimited boards",
      "Unlimited notes",
      "Basic collaboration",
      "7-day history",
    ],
    buttonText: "Get Started",
    buttonVariant: "outline" as const,
    highlighted: false,
    redirect: "/dashboard",
  },
  {
    name: "Team",
    price: "$9",
    period: "per month",
    description: "For growing teams that need more",
    features: [
      "Unlimited boards",
      "Unlimited notes",
      "Advanced collaboration",
      "30-day history",
      "Priority support",
      "Custom integrations",
    ],
    buttonText: "Upgrade Now",
    buttonVariant: "default" as const,
    highlighted: true,
  },
];

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function triggerStripeCheckout() {
    try {
      setIsLoading(true);
      const userResponse = await fetch("/api/user");
      if (userResponse.status === 401) {
        router.push("/auth/signin");
        return;
      }

      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (!userData.name) {
          router.push("/setup/profile");
          return;
        }
        if (!userData.organization) {
          router.push("/setup/organization");
          return;
        }

        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          body: JSON.stringify({
            organizationId: userData.organization.id,
          }),
        });
        const data = await res.json();
        if (!data.url) return toast.error("Failed to Initiate stripe session");
        router.push(data.url);
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error("Error adding board:", error);
      toast.error("Failed to Initiate stripe session");
    }
  }
  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
          Simple, transparent pricing
        </h2>
        <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
          Choose the plan that's right for your team
        </p>
      </div>
      <div className="mt-16 grid gap-8 justify-center lg:grid-cols-2">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`flex flex-col ${plan.highlighted && "border-blue-500 dark:border-blue-400 border-2 "} bg-white dark:bg-zinc-900 dark:text-white`}
          >
            <CardHeader>
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-4xl font-extrabold">{plan.price}</span>
                {plan.period && <span className="text-xl ml-2">{plan.period}</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-gray-600 dark:text-gray-300 mb-4">{plan.description}</p>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.buttonVariant}
                onClick={() => {
                  if (plan.redirect) {
                    router.push(plan.redirect);
                  } else {
                    triggerStripeCheckout();
                  }
                }}
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  </>
                ) : (
                  <>{plan.buttonText}</>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}