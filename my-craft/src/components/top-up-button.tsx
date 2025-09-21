'use client';

import { Button } from '@/components/echo-button';
import { MoneyInput } from '@/components/money-input';
import { type EchoContextValue } from '@merit-systems/echo-react-sdk';
import { Check, CreditCard, Edit, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function EchoTopUpButton({ echo }: { echo: EchoContextValue }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { createPaymentLink } = echo;

  const [amount, setAmount] = useState(10);

  return (
    <div className="flex items-center gap-2 h-11">
      {isEditing ? (
        <>
          <MoneyInput
            setAmount={setAmount}
            initialAmount={amount}
            className="flex-1"
            placeholder="Enter amount"
          />
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={() => setIsEditing(false)}
          >
            <Check className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <Button
            className="flex-1"
            size="lg"
            variant="turbo"
            disabled={isLoading}
            onClick={() => {
              setIsLoading(true);
              createPaymentLink(amount)
                .then(url => window.open(url, '_blank'))
                .finally(() => setIsLoading(false));
            }}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Processing...' : `Add ${amount} Credits`}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
