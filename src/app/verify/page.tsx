import { redirect } from "next/navigation";

// Phone codes are paused, so old links go to log in.
export default function Verify() {
  redirect("/login");
}
