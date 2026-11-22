
"use client";

import { FormEvent, useState } from "react";

export default function ContactSection() {
  const [status, setStatus] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setStatus("Sending message…");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          subject: formData.get("subject"),
          message: formData.get("message"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Message could not be saved");
      setStatus("Message received. Thank you for contacting EventCrowd.");
      form.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit message");
    }
  }

  return (
    <section
      id="contact"
      className="scroll-mt-24 border-t border-slate-800 bg-slate-900/40 px-6 py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
            Get in Touch
          </p>

          <h2 className="text-3xl font-bold md:text-4xl">
            Contact EventCrowd
          </h2>

          <p className="mt-4 text-slate-400">
            Have questions or suggestions? Send us a message.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-slate-800 bg-slate-950 p-8"
        >
          <div>
            <label
              htmlFor="contact-name"
              className="mb-2 block text-sm font-medium text-white"
            >
              Name
            </label>

            <input
              id="contact-name"
              type="text"
              name="name"
              required
              maxLength={100}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="contact-email"
              className="mb-2 block text-sm font-medium text-white"
            >
              Email
            </label>

            <input
              id="contact-email"
              type="email"
              name="email"
              required
              maxLength={254}
              placeholder="Enter your email"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="contact-subject"
              className="mb-2 block text-sm font-medium text-white"
            >
              Subject
            </label>

            <input
              id="contact-subject"
              type="text"
              name="subject"
              required
              maxLength={150}
              placeholder="Enter message subject"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="mb-2 block text-sm font-medium text-white"
            >
              Message
            </label>

            <textarea
              id="contact-message"
              name="message"
              required
              maxLength={5000}
              rows={5}
              placeholder="Write your message..."
              className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Send Message
          </button>

          {status && (
            <p
              role="status"
              className="text-center text-sm text-blue-400"
            >
              {status}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
