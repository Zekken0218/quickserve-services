import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ServiceCardProps {
  title: string;
  description: string;
  price: string;
  image: string;
  category: string;
  onBook: () => void;
}

const ServiceCard = ({ title, description, price, image, category, onBook }: ServiceCardProps) => {
  const fallbackImage = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80";
  const [imgSrc, setImgSrc] = useState<string>(image || fallbackImage);
  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
      <div className="aspect-video w-full overflow-hidden bg-muted">
        <img
          src={imgSrc}
          alt={title}
          className="h-full w-full object-cover transition-transform hover:scale-105 duration-300"
          onError={() => {
            if (imgSrc !== fallbackImage) setImgSrc(fallbackImage);
          }}
        />
      </div>
      <CardHeader>
        <div className="flex justify-end">
          <span className="text-base sm:text-lg font-bold text-primary whitespace-nowrap">
            {price}
          </span>
        </div>
        <CardTitle className="mt-2 text-xl break-words">{title}</CardTitle>
        <div className="mt-2">
          <Badge variant="secondary">{category}</Badge>
        </div>
        <CardDescription className="mt-2 line-clamp-2">{description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button className="w-full" onClick={onBook}>
          Book Now
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ServiceCard;
