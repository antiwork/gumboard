"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { X, Plus, LoaderCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const organizationSetupSchema = z.object({
  organizationName: z.string().min(1, "Organization Name is required"),
  teamEmails: z.array(
    z.object({
      email: z.string().email({ message: "Invalid email address" }).or(z.literal("")),
    })
  ),
});

type OrganizationSetupFormValues = z.infer<typeof organizationSetupSchema>;

interface OrganizationSetupFormProps {
  onSubmit: (orgName: string, teamEmails: string[]) => Promise<void>;
}

export default function OrganizationSetupForm({ onSubmit }: OrganizationSetupFormProps) {
  const form = useForm<OrganizationSetupFormValues>({
    resolver: zodResolver(organizationSetupSchema),
    defaultValues: {
      organizationName: "",
      teamEmails: [{ email: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "teamEmails",
  });

  const handleSubmit = async (values: OrganizationSetupFormValues) => {
    // Filter out any empty email strings and map to an array of just the email strings
    const validEmails = values.teamEmails
      .filter((item) => item.email.trim() !== "")
      .map((item) => item.email);

    await onSubmit(values.organizationName, validEmails);
  };

  // Check if there are any valid emails to change the button text
  const hasValidEmails = form.watch("teamEmails").some((item) => item.email.trim() !== "");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 dark:text-zinc-400">
        {/* Form field for Organization Name */}
        <FormField
          control={form.control}
          name="organizationName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your organization name" className="w-full" {...field} />
              </FormControl>
              <FormMessage className="text-xs text-red-600" />
            </FormItem>
          )}
        />

        {/* Dynamic fields for Team Member Emails */}
        <div className="space-y-4 transition-all">
          <FormLabel>Team Member Email Addresses</FormLabel>
          <AnimatePresence>
            <div className="space-y-3">
              {fields.map((item, index) => (
                <motion.div
                  key={item.id}
                  className="flex gap-2"
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  <FormField
                    control={form.control}
                    name={`teamEmails.${index}.email`}
                    render={({ field }) => (
                      <FormItem className="flex-1 m-0">
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="teammate@company.com"
                            className="flex-1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs text-red-600" />
                      </FormItem>
                    )}
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                      className="shrink-0 self-start active:scale-90"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          </AnimatePresence>

          <Button
            type="button"
            variant="ghost"
            onClick={() => append({ email: "" })}
            className="w-full bg-blue-500  text-white active:scale-95"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>

          <p className="text-xs text-muted-foreground">
            {"we'll send invitations to join your organization to these email addresses."}
          </p>
        </div>

        <Button
          type="submit"
          className="w-full bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
          ) : hasValidEmails ? (
            "Save & Send Invites"
          ) : (
            "Save"
          )}
        </Button>
      </form>
    </Form>
  );
}
