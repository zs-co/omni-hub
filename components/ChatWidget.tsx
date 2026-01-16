"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useMessage } from "../hooks/useMessage";

export default function ChatWidget() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [messages, setMessages] = useState<{ from: "user" | "bot"; text: string }[]>([]);
    const scrollerRef = useRef<HTMLDivElement | null>(null);

    const toggleOpen = () => setOpen(v => !v);

    useEffect(() => {
        async function getMessages() {
            const rows = await useMessage.fetch(useMessage.getOrCreateSessionId());
            console.log("prefetched", rows);
            if (Array.isArray(rows) && rows.length > 0) {
                setMessages(
                    rows.map((r: any) => ({
                        from: r.role == 'User' ? 'user' : 'bot',
                        text: r.message ?? r.text ?? "",
                    })),
                );
                setTimeout(
                    () =>
                        scrollerRef.current?.scrollTo({
                            top: scrollerRef.current!.scrollHeight,
                            behavior: "smooth",
                        }),
                    50,
                );
            }
        }
        if (open) {
            getMessages();
        }
    }, [open]);

    const send = async () => {
        if (!input.trim()) return;
        const text = input.trim();
        setMessages(m => [...m, { from: "user", text }]);
        setInput("");
        try {
            setIsLoading(true);
            const { message, from } = await useMessage.send(text);
            // scroll to bottom shortly after appending
            setMessages(m => [...m, { from: "bot", text: message }]);
        } catch (error) {
            console.log(error);
        } finally {
            setIsLoading(false);
        }
        setTimeout(
            () =>
                scrollerRef.current?.scrollTo({
                    top: scrollerRef.current.scrollHeight,
                    behavior: "smooth",
                }),
            250,
        );
    };

    return (
        <div>
            {/* Floating button */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
                {open && (
                    <Card className="w-[320px] max-w-[90vw] shadow-lg">
                        <CardHeader className="flex items-center justify-between px-4 py-3">
                            <CardTitle className="text-sm">Chat</CardTitle>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setMessages([])}
                                    aria-label="Clear chat"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="size-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M3 6h18M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"
                                        />
                                    </svg>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleOpen}
                                    aria-label="Close chat"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="size-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M6 6l12 12M6 18L18 6"
                                        />
                                    </svg>
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="px-3 py-2">
                            <div
                                ref={scrollerRef}
                                className="flex h-48 flex-col gap-2 overflow-y-auto rounded-md px-2"
                            >
                                {messages.length === 0 && (
                                    <div className="text-sm text-muted-foreground">
                                        Say hi — ask a question and click Send.
                                    </div>
                                )}
                                {messages.map((m, i) => (
                                    <div
                                        key={i}
                                        className={`max-w-[85%] ${
                                            m.from === "user"
                                                ? "self-end bg-primary text-primary-foreground rounded-md px-3 py-2"
                                                : "self-start bg-muted rounded-md px-3 py-2 text-sm text-muted-foreground"
                                        }`}
                                    >
                                        {m.text}
                                    </div>
                                ))}
                            </div>
                        </CardContent>

                        <CardFooter className="gap-2">
                            <Textarea
                                placeholder="Type your message..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        send();
                                    }
                                }}
                                className="min-h-[44px] max-h-28"
                            />
                            <div className="flex items-center gap-2">
                                <Button onClick={send} disabled={isLoading}>
                                    Send
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                )}

                <Button
                    onClick={toggleOpen}
                    variant="secondary"
                    size="icon"
                    aria-label="Open chat"
                    className="shadow-xl"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="size-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                    >
                        <path
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                        />
                    </svg>
                </Button>
            </div>
        </div>
    );
}
