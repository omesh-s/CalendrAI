import React, { useState } from 'react';
import { Avatar, AvatarImage,AvatarFallback } from '@/components/ui/avatar';
import { Plus } from 'lucide-react'; // Import Plus icon from Lucide React

interface AvatarProps {
  src: string; // Interface to define props for Avatar component
}

export default function AvatarGroup({ avatars }: { avatars: string[] }) {
  const [hoveredIndex, setHoveredIndex] = useState(-1); // Track hovered avatar index

  const handleMouseEnter = (index: number) => {
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(-1);
  };

  const isOverflow = avatars.length > 8; // Check for overflow

  return (
    <div className="flex flex-row-reverse justify-end -space-x-5 space-x-reverse *:ring *:ring-accent *:ring *:ring-2">
      {avatars.slice(0, isOverflow ?5 : avatars.length).map((avatarUrl, index) => (
        <Avatar
          key={index}
          className={`ring-0 transform transition duration-200 ease-in-out ${
            hoveredIndex === index ? 'scale-105 z-50' : ''
          }`}
          onMouseEnter={() => handleMouseEnter(index)}
          onMouseLeave={handleMouseLeave}
        >
          <AvatarImage src={avatarUrl} />
        </Avatar>
      ))}
      {isOverflow && (
        <Avatar key="overflow" className="ring-0 bg-primary">
           <AvatarFallback> </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
