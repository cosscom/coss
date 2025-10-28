"use client"

import { useEffect, useState } from "react"
import { UserRoundPlusIcon, UsersRoundIcon } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/registry/default/ui/avatar"
import { Button } from "@/registry/default/ui/button"
import { Skeleton } from "@/registry/default/ui/skeleton"

const users = [
  {
    name: "Sarah Johnson",
    role: "Design Engineer",
    followers: "15k",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&dpr=2&q=80",
    fallback: "SJ",
    delay: 3000,
  },
  {
    name: "Mark Bennett Andersson",
    role: "Product Designer",
    followers: "8k",
    image:
      "https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=80&h=80&dpr=2&q=80",
    fallback: "MA",
    delay: 4000,
  },
  {
    name: "Alex Rivera",
    role: "UI/UX Designer",
    followers: "12k",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&dpr=2&q=80",
    fallback: "AR",
    delay: 3400,
  },
]

function UserCard({ delay, user }: { delay: number; user: (typeof users)[0] }) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  if (!isLoaded) {
    return <UserCardSkeleton />
  }

  return (
    <>
      <Avatar className="size-10">
        <AvatarImage src={user.image} alt={user.name} />
        <AvatarFallback>{user.fallback}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h4 className="line-clamp-1 text-sm font-medium">{user.name}</h4>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="truncate">{user.role}</span>
          <div className="flex min-w-0 items-center gap-1">
            <UsersRoundIcon className="size-3 shrink-0" />
            <span className="truncate">
              {user.followers}
              <span className="max-sm:hidden"> followers</span>
            </span>
          </div>
        </div>
      </div>
      <Button size="xs">
        <UserRoundPlusIcon />
        Follow
      </Button>
    </>
  )
}

function UserCardSkeleton() {
  return (
    <>
      <Skeleton className="size-10 rounded-full" />
      <div className="flex flex-1 flex-col">
        <Skeleton className="my-0.5 h-4 max-w-54" />
        <div className="flex max-w-54 items-center gap-1">
          <Skeleton className="my-0.5 h-4 w-1/2" />
          <Skeleton className="my-0.5 h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-6 w-17" />
    </>
  )
}

export default function SkeletonDemo() {
  return (
    <div className="flex w-full max-w-92 flex-col gap-6">
      {users.map((user) => (
        <div key={user.fallback} className="flex items-center gap-4">
          <UserCard delay={user.delay} user={user} />
        </div>
      ))}
    </div>
  )
}
