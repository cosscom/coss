"use client";

import type React from "react";
import { useEffect, useState } from "react";

import { Input } from "@/registry/default/ui/input";
import { Label } from "@/registry/default/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";
import { Slider } from "@/registry/default/ui/slider";

import CopyClass from "./copy-class";

interface Easing {
  name: string;
  points: number[];
}

interface EasingsProps {
  easings: Easing[];
}

type EasingFilter = "all" | "in" | "out" | "in-out";

const defaultConfig = {
  width: 140,
  height: 140,
  padding: 20,
  plotSize: 100,
  animationDuration: 1000,
  pauseDuration: 1000,
};

type AnimationType = "translate" | "scale" | "rotate";

function useAnimationKey(
  duration: number,
  pauseDuration: number,
  _animationType: AnimationType,
) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => {
        setKey((prevKey) => prevKey + 1);
      },
      (duration + pauseDuration) * 1000,
    );

    return () => clearInterval(timer);
  }, [duration, pauseDuration]);

  return key;
}

const EasingSVG = ({
  easing,
  config,
  duration,
  animationType,
  pauseDuration,
}: {
  easing: Easing;
  config: typeof defaultConfig;
  duration: number;
  animationType: AnimationType;
  pauseDuration: number;
}) => {
  const key = useAnimationKey(duration, pauseDuration, animationType);

  const getAnimationStyle = () => {
    if (!easing.points.length || duration <= 0) return {};

    return {
      ["--bezier-coordinates" as string]: easing.points.join(","),
      ["--animation-duration" as string]: `${duration}s`,
      ["--total-duration" as string]: `${duration + pauseDuration}s`,
      animationName: "moveCircleVertically",
      animationDuration: `${duration}s`,
      animationTimingFunction: `cubic-bezier(${easing.points.join(",")})`,
      animationIterationCount: "1",
      animationFillMode: "forwards",
      animationDelay: "0s",
    };
  };

  return (
    <svg
      className="w-full"
      height={config.height}
      viewBox={`0 0 ${config.width} ${config.height}`}
      width={config.width}
    >
      {/* Grid */}
      <rect
        className="fill-none stroke-muted-foreground/20"
        height={config.plotSize}
        strokeWidth="1"
        width={config.plotSize}
        x={config.padding}
        y={config.padding}
      />

      {/* Diagonal line */}
      <line
        className="stroke-muted-foreground/20"
        strokeWidth="1"
        x1={config.padding}
        x2={config.width - config.padding}
        y1={config.height - config.padding}
        y2={config.padding}
      />

      {/* Bezier curve */}
      <path
        className="stroke-muted-foreground"
        d={`M${config.padding},${config.height - config.padding} C${config.padding + easing.points[0] * config.plotSize},${
          config.height - config.padding - easing.points[1] * config.plotSize
        } ${config.padding + easing.points[2] * config.plotSize},${
          config.height - config.padding - easing.points[3] * config.plotSize
        } ${config.padding + config.plotSize},${config.height - config.padding - config.plotSize}`}
        fill="none"
        strokeWidth="2"
      />

      {/* Start point */}
      <circle
        className="fill-muted-foreground"
        cx={config.padding}
        cy={config.height - config.padding}
        r="4"
      />

      {/* End point */}
      <circle
        className="fill-muted-foreground"
        cx={config.width - config.padding}
        cy={config.padding}
        r="4"
      />

      {/* Animated circle */}
      <g
        className="animated-circle"
        key={`${key}-${duration}-${pauseDuration}-${animationType}`}
        style={getAnimationStyle()}
      >
        <circle
          className="fill-primary"
          cx={config.padding}
          cy={config.height - config.padding}
          r="4"
          style={{
            animationName: "moveCircleHorizontally",
            animationDuration: `${duration}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "1",
            animationFillMode: "forwards",
            animationDelay: "0s",
          }}
        />
      </g>
      <style jsx>{`
        @keyframes moveCircleHorizontally {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(${config.plotSize}px);
          }
        }
        @keyframes moveCircleVertically {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-${config.plotSize}px);
          }
        }
      `}</style>
    </svg>
  );
};

const AnimatedSquare = ({
  easing,
  duration,
  animationType,
  pauseDuration,
}: {
  easing: Easing;
  duration: number;
  animationType: AnimationType;
  pauseDuration: number;
}) => {
  const key = useAnimationKey(duration, pauseDuration, animationType);

  const getAnimationStyle = () => {
    if (!easing.points.length || duration <= 0) return {};

    const baseStyle = {
      ["--bezier-coordinates" as string]: easing.points.join(","),
      ["--animation-duration" as string]: `${duration}s`,
      ["--total-duration" as string]: `${duration + pauseDuration}s`,
    };

    const animationName = {
      translate: "translateSquare",
      scale: "scaleSquare",
      rotate: "rotateSquare",
    }[animationType];

    return {
      ...baseStyle,
      animationName,
      animationDuration: `${duration}s`,
      animationTimingFunction: `cubic-bezier(${easing.points.join(",")})`,
      animationIterationCount: "1",
      animationFillMode: "forwards",
      animationDelay: "0s",
    };
  };

  const animationStyle = getAnimationStyle();

  return (
    <div
      className={`pointer-events-none flex w-full items-center ${animationType === "translate" ? "justify-start" : "justify-center"}`}
      key={`${key}-${duration}-${pauseDuration}-${animationType}`}
      style={animationType === "translate" ? animationStyle : undefined}
    >
      <div
        className="animated-square h-10 w-10 rounded-md bg-linear-to-tr from-primary to-primary/80 shadow-lg shadow-primary/10"
        style={animationType !== "translate" ? animationStyle : undefined}
      />
      <style jsx>{`
        @keyframes translateSquare {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(100% - 2.5rem));
          }
        }
        @keyframes scaleSquare {
          0% {
            transform: scale(0);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes rotateSquare {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default function Easings({ easings }: EasingsProps) {
  const [duration, setDuration] = useState(defaultConfig.animationDuration);
  const [tempDuration, setTempDuration] = useState(
    defaultConfig.animationDuration,
  );
  const pauseDuration = defaultConfig.pauseDuration;
  const [animationType, setAnimationType] =
    useState<AnimationType>("translate");
  const [easingFilter, setEasingFilter] = useState<EasingFilter>("all");

  const handleSliderChangeEnd = (value: number[]) => {
    setDuration(value[0]);
  };

  const handleSliderChange = (value: number[]) => {
    setTempDuration(value[0]);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(event.target.value, 10);
    if (!Number.isNaN(value) && value >= 0 && value <= 5000) {
      setTempDuration(value);
    }
  };

  const handleInputBlur = () => {
    if (tempDuration >= 0 && tempDuration <= 5000) {
      setDuration(tempDuration);
    } else {
      setTempDuration(duration);
    }
  };

  const getFilteredEasings = () => {
    if (easingFilter === "all") return easings;

    return easings.filter((easing) => {
      const name = easing.name.toLowerCase();
      switch (easingFilter) {
        case "in":
          return (
            (name.startsWith("easein") && !name.includes("inout")) ||
            name === "ease-in"
          );
        case "out":
          return name.startsWith("easeout") || name === "ease-out";
        case "in-out":
          return (
            name.startsWith("easeinout") ||
            name === "ease-in-out" ||
            name === "ease"
          );
        default:
          return true;
      }
    });
  };

  return (
    <div className="mb-12 space-y-6">
      <div className="py-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex flex-col gap-2">
            <Label>Duration</Label>
            <div className="flex items-center gap-4">
              <Slider
                className="w-[180px]"
                max={5000}
                min={0}
                onValueChange={handleSliderChange}
                onValueCommit={handleSliderChangeEnd}
                step={1}
                value={[tempDuration]}
              />
              <Input
                className="w-[90px]"
                max={5000}
                min={0}
                onBlur={handleInputBlur}
                onChange={handleInputChange}
                type="number"
                value={tempDuration}
              />
              <span className="text-muted-foreground text-sm">ms</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-2">
              <Label>Filter</Label>
              <Select
                onValueChange={(value: EasingFilter) => setEasingFilter(value)}
                value={easingFilter}
              >
                <SelectTrigger className="h-9 w-[100px]">
                  <SelectValue placeholder="Select animation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="in">In</SelectItem>
                  <SelectItem value="out">Out</SelectItem>
                  <SelectItem value="in-out">In-Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Animation type</Label>
              <Select
                onValueChange={(value: AnimationType) =>
                  setAnimationType(value)
                }
                value={animationType}
              >
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Select animation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="translate">Translate</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                  <SelectItem value="rotate">Rotate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" id="grid">
        {getFilteredEasings().map((easing) => (
          <div
            className="group relative flex aspect-square flex-col items-center justify-center gap-4 rounded-xl bg-muted/65"
            key={`${easing.name}-${easingFilter}`}
          >
            <div className="pt-6 text-center font-medium text-sm">
              {easing.name}
            </div>

            <div className="flex w-full grow flex-col items-start justify-center px-8">
              <div className="mb-4 flex w-full justify-center">
                <EasingSVG
                  animationType={animationType}
                  config={defaultConfig}
                  duration={duration / 1000}
                  easing={easing}
                  key={`svg-${easing.name}-${easingFilter}`}
                  pauseDuration={pauseDuration / 1000}
                />
              </div>
              <AnimatedSquare
                animationType={animationType}
                duration={duration / 1000}
                easing={easing}
                key={`square-${easing.name}-${easingFilter}`}
                pauseDuration={pauseDuration / 1000}
              />
            </div>

            <div className="flex items-center justify-center gap-2 pb-5">
              {/* Using decodeURIComponent to properly escape special characters in the class name.
                  Without this, Tailwind shows a warning: The class ... is ambiguous and matches multiple utilities. */}
              <CopyClass
                value={`ease-[cubic-bezier(${easing.points.join(",")})]`}
              />
            </div>
          </div>
        ))}
      </div>
      <style global jsx>{`
        @media (min-width: 768px) {
          .group,
          .animated-circle,
          .animated-square {
            transition: opacity 0.25s ease;
          }
          #grid:hover .group {
            opacity: 0.5;
          }
          #grid:hover .group .animated-circle,
          #grid:hover .group .animated-square {
            opacity: 0;
          }
          #grid .group:hover,
          #grid .group:hover .animated-circle,
          #grid .group:hover .animated-square {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
