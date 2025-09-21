import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const Credits: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            ChatNexus Credits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Development Team</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                    QS
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="font-semibold">Quibly Services</div>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="default">Lead Developer</Badge>
                    <Badge variant="secondary">Scripter</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="text-center space-y-2">
            <h4 className="font-medium text-muted-foreground">Technologies Used</h4>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline">React</Badge>
              <Badge variant="outline">TypeScript</Badge>
              <Badge variant="outline">Supabase</Badge>
              <Badge variant="outline">Tailwind CSS</Badge>
              <Badge variant="outline">Vite</Badge>
            </div>
          </div>
          
          <Separator />
          
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2024 ChatNexus. Built with passion and dedication.</p>
            <p className="mt-1">Thank you for using our platform!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Credits;