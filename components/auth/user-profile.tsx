"use client";

import { LogoutButton } from "./logout-button";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface UserProfileProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
}

export function UserProfile({ user }: UserProfileProps) {
  // Extraction des initiales pour le fallback de l'avatar
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Card className="w-full max-w-md border-none shadow-lg">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        <Avatar className="h-16 w-16 border-2 border-cyan-500">
          <AvatarImage src={user.image || ""} alt={user.name} />
          <AvatarFallback className="bg-cyan-100 text-cyan-900 font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <CardTitle className="text-xl">{user.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm font-medium">Statut du compte</span>
            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
              Actif
            </Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <LogoutButton className="w-full" variant="destructive" />
      </CardFooter>
    </Card>
  );
}