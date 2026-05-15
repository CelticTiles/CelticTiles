"use client";

import { useEffect, useRef } from "react";

/**
 * Custom hook for animating a typewriter effect on an input placeholder.
 * The prefix stays fixed while suffix words rotate with typing animation.
 *
 * @param selector - CSS selector for the input element
 * @param suffixes - Array of suffix strings to rotate through
 */
export function useSearchPlaceholderTypewriter(
  selector: string,
  suffixes: string[]
): void {
  // Use ref to track animation state
  const animationRef = useRef<{
    timeoutId: ReturnType<typeof setTimeout> | null;
    isRunning: boolean;
  }>({ timeoutId: null, isRunning: false });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (suffixes.length === 0) return;

    const PREFIX = "Search For ";
    let currentSuffixIndex = 0;
    let currentCharIndex = 0;
    let isTyping = true;
    const animationState = animationRef.current;
    
    // Prevent multiple animations
    if (animationState.isRunning) {
      return;
    }
    animationState.isRunning = true;

    // Wait for DOM to be ready
    const initTimeout = setTimeout(() => {
      const inputElement = document.querySelector(
        selector
      ) as HTMLInputElement | null;

        if (!inputElement) {
          console.warn(
            `useSearchPlaceholderTypewriter: Element "${selector}" not found`
          );
          animationState.isRunning = false;
          return;
        }

      // Set initial placeholder
      inputElement.placeholder = PREFIX;

        const animate = () => {
          // Check if element still exists
          if (!document.querySelector(selector)) {
            animationState.isRunning = false;
            return;
          }

          const currentSuffix = suffixes[currentSuffixIndex];

        if (isTyping) {
          // Typing phase
          if (currentCharIndex <= currentSuffix.length) {
            const displayText = PREFIX + currentSuffix.substring(0, currentCharIndex);
            inputElement.placeholder = displayText;
            currentCharIndex++;

            if (currentCharIndex > currentSuffix.length) {
              // Finished typing, pause before deleting
              isTyping = false;
              animationState.timeoutId = setTimeout(animate, 2000);
            } else {
              // Continue typing
              animationState.timeoutId = setTimeout(animate, 120);
            }
          }
        } else {
          // Deleting phase
          if (currentCharIndex > 0) {
            currentCharIndex--;
            const displayText = PREFIX + currentSuffix.substring(0, currentCharIndex);
            inputElement.placeholder = displayText;
            animationState.timeoutId = setTimeout(animate, 60);
          } else {
            // Move to next suffix
            isTyping = true;
            currentSuffixIndex = (currentSuffixIndex + 1) % suffixes.length;
            animationState.timeoutId = setTimeout(animate, 400);
          }
        }
      };

      // Start animation with delay
      animationState.timeoutId = setTimeout(animate, 800);
    }, 150);

    // Cleanup
    return () => {
      clearTimeout(initTimeout);
      if (animationState.timeoutId) {
        clearTimeout(animationState.timeoutId);
        animationState.timeoutId = null;
      }
      animationState.isRunning = false;
    };
  }, [selector, suffixes]);
}
