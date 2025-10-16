import { InfoIcon } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/registry/default/ui/alert"

export default function AlertWithIcon() {
  return (
    <Alert>
      <InfoIcon />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        <p>Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.</p>
        <p>Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.Describe what can be done about it here.</p>
      </AlertDescription>
    </Alert>
  )
}
