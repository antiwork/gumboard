"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// import { Badge } from "@/components/ui/badge";
import { Check, Crown, Users, Zap, Shield } from "lucide-react";

interface TeamPlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Team Plan Upgrade Modal Component
 * Shows pricing and features for the Team Plan subscription
 * Handles Stripe Checkout integration
 */
export function TeamPlanUpgradeModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: TeamPlanUpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const features = [
    {
      icon: <Users className="h-5 w-5" />,
      title: "Invite Unlimited Team Members",
      description: "Add as many teammates as you need to collaborate"
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Real-time Collaboration",
      description: "Work together on boards with live updates"
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Team Management",
      description: "Manage permissions and organize your workspace"
    },
    {
      icon: <Crown className="h-5 w-5" />,
      title: "Priority Support",
      description: "Get help when you need it with priority assistance"
    }
  ];

  /**
   * Handle upgrade button click
   * For now, just shows a placeholder message
   * TODO: Integrate with Stripe checkout when backend is ready
   */
  const handleUpgrade = async () => {
    setIsLoading(true);
    
    // Simulate processing time
    setTimeout(() => {
      alert('Team Plan upgrade coming soon! Backend integration will be added later.');
      setIsLoading(false);
      onClose();
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            Upgrade to Team Plan
          </DialogTitle>
          <DialogDescription className="text-base">
            Unlock team collaboration features and invite your teammates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pricing */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-4xl font-bold">$9</span>
              <div className="text-left">
                <div className="text-sm text-muted-foreground">per month</div>
                {/* <Badge variant="secondary" className="text-xs">
                  Billed monthly
                </Badge> */}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Cancel anytime • No setup fees
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h4 className="font-semibold text-center">What's included:</h4>
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5 text-green-600">
                    {feature.icon}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{feature.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {feature.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current limitation notice */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-amber-800 dark:text-amber-200">
                  Team features required
                </div>
                <div className="text-amber-700 dark:text-amber-300">
                  To invite team members and collaborate on boards, you need the Team Plan.
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
