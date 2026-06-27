import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Mail,
  Phone,
  User,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MailOpen,
  MailX,
  Clock,
  AlertCircle,
} from "lucide-react";
import contactService from "../../services/contactService.js";
import toast from "react-hot-toast";

const formatDate = (iso) =>
  new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const READ_OPTIONS = [
  { value: "", label: "All Messages" },
  { value: "false", label: "Unread" },
  { value: "true", label: "Read" },
];

const LIMIT = 20;

export default function ContactMessagesPage() {
  const queryClient = useQueryClient();
  const [isRead, setIsRead] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "contacts", { page, limit: LIMIT, isRead }],
    queryFn: () =>
      contactService.getAllContacts({
        page,
        limit: LIMIT,
        isRead: isRead !== "" ? isRead : undefined,
      }),
    keepPreviousData: true,
    staleTime: 30 * 1000,
  });

  const contacts = data?.contacts || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const unreadCount = data?.unreadCount ?? 0;

  const { data: selectedContact, isLoading: loadingDetail } = useQuery({
    queryKey: ["admin", "contacts", selectedId],
    queryFn: () => contactService.getContactById(selectedId),
    enabled: !!selectedId,
    staleTime: 0,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "contacts"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "unread-contacts"] });
  };

  const { mutate: markRead, isPending: markingRead } = useMutation({
    mutationFn: (id) => contactService.markAsRead(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["admin", "contacts", selectedId] });
      toast.success("Marked as read.");
    },
    onError: (err) => toast.error(err.message || "Could not mark as read."),
  });

  const { mutate: markUnread, isPending: markingUnread } = useMutation({
    mutationFn: (id) => contactService.markAsUnread(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["admin", "contacts", selectedId] });
      toast.success("Marked as unread.");
    },
    onError: (err) => toast.error(err.message || "Could not mark as unread."),
  });

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id) => contactService.deleteContact(id),
    onSuccess: () => {
      invalidate();
      setSelectedId(null);
      toast.success("Message deleted.");
    },
    onError: (err) => toast.error(err.message || "Could not delete message."),
  });

  const handleSelect = (id) => setSelectedId(id);

  const handleDelete = (id, name) => {
    if (!window.confirm(`Delete message from "${name}"? This cannot be undone.`)) return;
    remove(id);
  };

  const handleFilter = (e) => {
    setIsRead(e.target.value);
    setPage(1);
    setSelectedId(null);
  };

  const actionBusy = markingRead || markingUnread || deleting;
  const activeContact = selectedContact || contacts.find((c) => c._id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#1a1a1a]">
            Contact Messages
          </h1>
          <p className="text-xs text-[#888] mt-1">
            {total} message{total !== 1 ? "s" : ""}
            {unreadCount > 0 && (
              <span className="ml-2 text-[#c9a96e] font-medium">
                · {unreadCount} unread
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={isRead}
          onChange={handleFilter}
          className="border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] focus:outline-none focus:border-[#1a1a1a] bg-white"
        >
          {READ_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 lg:gap-6 items-start">
        {/* Message list */}
        <div
          className={`bg-white border border-[#e8e0d4] overflow-hidden transition-opacity ${
            isFetching && !isLoading ? "opacity-70" : "opacity-100"
          }`}
        >
          {isLoading ? (
            <div className="divide-y divide-[#f0ebe3]">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="px-4 py-4 animate-pulse space-y-2">
                  <div className="h-3 w-3/5 bg-[#ece8e0] rounded-full" />
                  <div className="h-2.5 w-4/5 bg-[#ece8e0] rounded-full" />
                </div>
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-10 text-center">
              <MessageSquare size={28} className="mx-auto text-[#ccc] mb-3" />
              <p className="text-sm text-[#888]">No messages found.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f0ebe3] max-h-[70vh] overflow-y-auto">
              {contacts.map((contact) => {
                const isActive = selectedId === contact._id;
                return (
                  <button
                    key={contact._id}
                    type="button"
                    onClick={() => handleSelect(contact._id)}
                    className={`w-full text-left px-4 py-4 transition-colors ${
                      isActive
                        ? "bg-[#f9f7f4] border-l-2 border-l-[#c9a96e]"
                        : "hover:bg-[#faf8f5] border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!contact.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#c9a96e] shrink-0 mt-1.5" />
                      )}
                      <div className={`min-w-0 flex-1 ${contact.isRead ? "pl-4" : ""}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm truncate ${
                              contact.isRead
                                ? "text-[#555] font-medium"
                                : "text-[#1a1a1a] font-semibold"
                            }`}
                          >
                            {contact.name}
                          </p>
                          <span className="text-[10px] text-[#aaa] shrink-0">
                            {formatDate(contact.createdAt).split(",")[0]}
                          </span>
                        </div>
                        <p className="text-xs text-[#888] truncate mt-0.5">
                          {contact.subject || "General Inquiry"}
                        </p>
                        <p className="text-xs text-[#aaa] truncate mt-1 line-clamp-1">
                          {contact.message}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {totalPages > 1 && !isLoading && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#f0ebe3] bg-[#f9f7f4]">
              <p className="text-[10px] text-[#888]">
                {page}/{totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    setSelectedId(null);
                  }}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center border border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    setSelectedId(null);
                  }}
                  disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center border border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message detail */}
        <div className="bg-white border border-[#e8e0d4] min-h-[320px] lg:min-h-[70vh]">
          {!selectedId ? (
            <div className="h-full flex flex-col items-center justify-center p-10 text-center">
              <Mail size={32} className="text-[#ddd] mb-3" />
              <p className="text-sm text-[#888]">
                Select a message to read
              </p>
            </div>
          ) : loadingDetail && !activeContact ? (
            <div className="p-6 space-y-4 animate-pulse">
              <div className="h-4 w-2/5 bg-[#ece8e0] rounded-full" />
              <div className="h-3 w-3/5 bg-[#ece8e0] rounded-full" />
              <div className="h-24 w-full bg-[#ece8e0] rounded-sm mt-6" />
            </div>
          ) : activeContact ? (
            <div className="flex flex-col h-full">
              <div className="px-5 py-4 border-b border-[#f0ebe3] flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-xl text-[#1a1a1a]">
                      {activeContact.subject || "General Inquiry"}
                    </h2>
                    <span
                      className={`text-[9px] tracking-[1.5px] uppercase font-bold px-2 py-0.5 ${
                        activeContact.isRead
                          ? "bg-[#f0ebe3] text-[#888]"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {activeContact.isRead ? "Read" : "Unread"}
                    </span>
                  </div>
                  <p className="text-xs text-[#aaa] mt-1 flex items-center gap-1">
                    <Clock size={11} />
                    {formatDate(activeContact.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {!activeContact.isRead ? (
                    <button
                      onClick={() => markRead(activeContact._id)}
                      disabled={actionBusy}
                      title="Mark as read"
                      className="p-2 text-[#888] hover:text-green-600 disabled:opacity-50 transition-colors"
                    >
                      <MailOpen size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => markUnread(activeContact._id)}
                      disabled={actionBusy}
                      title="Mark as unread"
                      className="p-2 text-[#888] hover:text-amber-600 disabled:opacity-50 transition-colors"
                    >
                      <MailX size={15} />
                    </button>
                  )}
                  <button
                    onClick={() =>
                      handleDelete(activeContact._id, activeContact.name)
                    }
                    disabled={actionBusy}
                    title="Delete"
                    className="p-2 text-[#bbb] hover:text-red-500 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="px-5 py-4 border-b border-[#f0ebe3] space-y-2">
                <div className="flex items-center gap-2 text-sm text-[#333]">
                  <User size={14} className="text-[#bbb] shrink-0" />
                  <span className="font-medium">{activeContact.name}</span>
                  {activeContact.user && (
                    <span className="text-xs text-[#aaa]">(registered user)</span>
                  )}
                </div>
                <a
                  href={`mailto:${activeContact.email}`}
                  className="flex items-center gap-2 text-sm text-[#555] hover:text-[#c9a96e] transition-colors"
                >
                  <Mail size={14} className="text-[#bbb] shrink-0" />
                  {activeContact.email}
                </a>
                {activeContact.phone && (
                  <a
                    href={`tel:${activeContact.phone}`}
                    className="flex items-center gap-2 text-sm text-[#555] hover:text-[#c9a96e] transition-colors"
                  >
                    <Phone size={14} className="text-[#bbb] shrink-0" />
                    {activeContact.phone}
                  </a>
                )}
              </div>

              <div className="flex-1 px-5 py-5 overflow-y-auto">
                <p className="text-sm text-[#444] leading-relaxed whitespace-pre-wrap">
                  {activeContact.message}
                </p>
              </div>

              {activeContact.readAt && (
                <div className="px-5 py-3 border-t border-[#f0ebe3] bg-[#f9f7f4]">
                  <p className="text-[11px] text-[#aaa] flex items-center gap-1">
                    <MailOpen size={11} />
                    Read on {formatDate(activeContact.readAt)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center">
              <AlertCircle size={24} className="mx-auto text-red-400 mb-2" />
              <p className="text-sm text-[#888]">Message not found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
