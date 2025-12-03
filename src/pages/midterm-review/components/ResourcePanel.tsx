
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import ResourceCard from '@/pages/resources/ResourceCard';

interface Resource {
  title: string;
  description: string;
  url: string;
}

interface ResourcePanelProps {
  resources: Resource[];
  onRateResource: (resourceId: string, rating: number) => void;
}

const ResourcePanel = ({ resources, onRateResource }: ResourcePanelProps) => {
  return (
    <Card className="border-2 border-studypurple-100 h-full">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">Resources to Fix Your Errors</h2>
        <ScrollArea className="h-[450px] pr-4">
          <div className="space-y-4">
            {resources.map(resource => (
              <ResourceCard 
                key={resource.title} 
                resource={resource}
                onRate={onRateResource}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ResourcePanel;
