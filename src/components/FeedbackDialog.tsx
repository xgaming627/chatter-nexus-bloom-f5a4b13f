import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star } from 'lucide-react';
import { useLiveSupport } from '@/context/LiveSupportContext';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FeedbackDialog: React.FC<FeedbackDialogProps> = ({ open, onOpenChange }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const { submitFeedback } = useLiveSupport();

  const handleSubmit = async () => {
    if (rating > 0) {
      try {
        await submitFeedback(rating, feedback);
        onOpenChange(false);
        setRating(0);
        setFeedback('');
      } catch (error) {
        console.error('Error submitting feedback:', error);
      }
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      return (
        <Star
          key={index}
          className={`w-6 h-6 cursor-pointer transition-colors ${
            starValue <= (hoveredRating || rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground'
          }`}
          onClick={() => setRating(starValue)}
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
        />
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[600px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Rate Your Support Experience</DialogTitle>
          <DialogDescription>
            Please rate your support session and provide feedback to help us improve.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          <div className="grid gap-6 py-4">
            <div className="grid gap-3">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {renderStars()}
              </div>
              <p className="text-xs text-muted-foreground">
                Click on stars to rate from 1 (poor) to 5 (excellent)
              </p>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="feedback">Additional Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Tell us about your experience..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={rating === 0}>
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;