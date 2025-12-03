
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Resource {
  title: string;
  description: string;
  url: string;
}

interface ResourceCardProps {
  resource: Resource;
  onRate: (resourceId: string, rating: number) => void;
  className?: string;
}

const ResourceCard = ({ resource, onRate, className = "" }: ResourceCardProps) => {
  const [rating, setRating] = useState<number | null>(null);
  const { toast } = useToast();
  
  const handleRate = (stars: number) => {
    setRating(stars);
    onRate(resource.title, stars); // Using title as ID for demo
    
    toast({
      title: "Resource Rated",
      description: `You rated "${resource.title}" ${stars} stars`,
    });
  };
  
  return (
    <Card className={`overflow-hidden border-2 border-studypurple-100 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-studypurple-100 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-4 w-4 text-studypurple-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold mb-1 line-clamp-1">{resource.title}</h3>
            <p className="text-studyneutral-300 mb-3 text-sm line-clamp-2">{resource.description}</p>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(star)}
                    className={`text-xl ${
                      (rating || 0) >= star
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    } focus:outline-none`}
                    aria-label={`Rate ${star} stars`}
                  >
                    ★
                  </button>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="border-studypurple-300 text-studypurple-500 w-full sm:w-auto"
                onClick={() => window.open(resource.url, '_blank')}
              >
                View Resource
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResourceCard;
