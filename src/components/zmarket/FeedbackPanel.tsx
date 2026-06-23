'use client'

import { useState, useEffect, useCallback } from 'react'
import { csrfFetch } from '@/lib/csrf-fetch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  MessageSquareWarning, Send, Filter, Search, Reply,
  CheckCircle2, AlertCircle, Loader2, ChevronLeft, ChevronRight,
  MessageCircle, Clock, AlertTriangle, Bug, Lightbulb, X
} from 'lucide-react'

// Types
interface FeedbackUser {
  id: string
  name: string
  email: string
  role: string
}

interface FeedbackReplier {
  id: string
  name: string
}

interface Feedback {
  id: string
  subject: string
  content: string
  type: string
  status: string
  priority: string
  userId: string
  adminReply: string | null
  repliedBy: string | null
  createdAt: string
  updatedAt: string
  user: FeedbackUser
  replier: FeedbackReplier | null
}

interface FeedbackStats {
  total: number
  pending: number
  inProgress: number
  resolved: number
}

interface FeedbackPanelProps {
  userId: string
  userRole: string
}

// Helpers
function getFeedbackTypeLabel(type: string): string {
  const map: Record<string, string> = {
    FEEDBACK: 'Phản hồi',
    COMPLAINT: 'Khiếu nại',
    SUGGESTION: 'Gợi ý',
    BUG_REPORT: 'Báo lỗi',
  }
  return map[type] || type
}

function getFeedbackTypeColor(type: string): string {
  const map: Record<string, string> = {
    FEEDBACK: 'bg-green-100 text-green-800',
    COMPLAINT: 'bg-red-100 text-red-800',
    SUGGESTION: 'bg-purple-100 text-purple-800',
    BUG_REPORT: 'bg-orange-100 text-orange-800',
  }
  return map[type] || 'bg-gray-100 text-gray-800'
}

function getFeedbackTypeIcon(type: string) {
  switch (type) {
    case 'FEEDBACK': return <MessageCircle className="h-3.5 w-3.5" />
    case 'COMPLAINT': return <AlertTriangle className="h-3.5 w-3.5" />
    case 'SUGGESTION': return <Lightbulb className="h-3.5 w-3.5" />
    case 'BUG_REPORT': return <Bug className="h-3.5 w-3.5" />
    default: return <MessageSquareWarning className="h-3.5 w-3.5" />
  }
}

function getFeedbackStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Chờ xử lý',
    IN_PROGRESS: 'Đang xử lý',
    RESOLVED: 'Đã giải quyết',
    CLOSED: 'Đã đóng',
  }
  return map[status] || status
}

function getFeedbackStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
  }
  return map[status] || 'bg-gray-100 text-gray-800'
}

function getFeedbackStatusIcon(status: string) {
  switch (status) {
    case 'PENDING': return <Clock className="h-3.5 w-3.5" />
    case 'IN_PROGRESS': return <Loader2 className="h-3.5 w-3.5" />
    case 'RESOLVED': return <CheckCircle2 className="h-3.5 w-3.5" />
    case 'CLOSED': return <X className="h-3.5 w-3.5" />
    default: return <AlertCircle className="h-3.5 w-3.5" />
  }
}

function getPriorityLabel(priority: string): string {
  const map: Record<string, string> = {
    LOW: 'Thấp',
    MEDIUM: 'Trung bình',
    HIGH: 'Cao',
    URGENT: 'Khẩn cấp',
  }
  return map[priority] || priority
}

function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    LOW: 'bg-slate-100 text-slate-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100 text-red-700',
  }
  return map[priority] || 'bg-gray-100 text-gray-800'
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ==================== USER MODE ====================
function UserFeedbackPanel({ userId }: { userId: string }) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Form state
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState('FEEDBACK')
  const [priority, setPriority] = useState('MEDIUM')

  const fetchFeedbacks = useCallback(async () => {
    try {
      const res = await fetch(`/api/feedback?page=${page}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setFeedbacks(data.feedbacks)
        setTotalPages(data.pagination.totalPages)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFeedbacks()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchFeedbacks])

  const handleSubmit = async () => {
    if (!subject.trim()) {
      toast.error('Vui lòng nhập tiêu đề')
      return
    }
    if (!content.trim() || content.trim().length < 10) {
      toast.error('Nội dung phải có ít nhất 10 ký tự')
      return
    }

    setSubmitting(true)
    try {
      const res = await csrfFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, content, type, priority }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gửi phản hồi thất bại')
      }
      toast.success('Gửi phản hồi thành công!')
      setSubject('')
      setContent('')
      setType('FEEDBACK')
      setPriority('MEDIUM')
      setPage(1)
      await fetchFeedbacks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gửi phản hồi thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Tabs defaultValue="form" className="w-full">
      <TabsList className="w-full grid grid-cols-2 mb-4">
        <TabsTrigger value="form" className="flex items-center gap-2">
          <Send className="h-4 w-4" />
          Gửi phản hồi
        </TabsTrigger>
        <TabsTrigger value="list" className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Phản hồi của tôi
        </TabsTrigger>
      </TabsList>

      {/* Feedback Form */}
      <TabsContent value="form">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5 text-emerald-600" />
              Gửi phản hồi mới
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fb-subject">Tiêu đề *</Label>
              <Input
                id="fb-subject"
                placeholder="Nhập tiêu đề phản hồi..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loại phản hồi</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FEEDBACK">
                      <span className="flex items-center gap-2">
                        <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                        Phản hồi
                      </span>
                    </SelectItem>
                    <SelectItem value="COMPLAINT">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                        Khiếu nại
                      </span>
                    </SelectItem>
                    <SelectItem value="SUGGESTION">
                      <span className="flex items-center gap-2">
                        <Lightbulb className="h-3.5 w-3.5 text-purple-600" />
                        Gợi ý
                      </span>
                    </SelectItem>
                    <SelectItem value="BUG_REPORT">
                      <span className="flex items-center gap-2">
                        <Bug className="h-3.5 w-3.5 text-orange-600" />
                        Báo lỗi
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mức ưu tiên</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Thấp</SelectItem>
                    <SelectItem value="MEDIUM">Trung bình</SelectItem>
                    <SelectItem value="HIGH">Cao</SelectItem>
                    <SelectItem value="URGENT">Khẩn cấp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fb-content">Nội dung * <span className="text-muted-foreground text-xs">(tối thiểu 10 ký tự)</span></Label>
              <Textarea
                id="fb-content"
                placeholder="Mô tả chi tiết phản hồi của bạn..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {content.length}/2000
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Gửi phản hồi
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* My Feedback List */}
      <TabsContent value="list">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
              Phản hồi của tôi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2 p-4 border rounded-lg">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquareWarning className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Chưa có phản hồi nào</p>
                <p className="text-sm mt-1">Hãy gửi phản hồi đầu tiên của bạn!</p>
              </div>
            ) : (
              <>
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-3 pr-4">
                    {feedbacks.map((fb) => (
                      <Card key={fb.id} className="border hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-medium text-sm leading-tight">{fb.subject}</h4>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="outline" className={`${getFeedbackTypeColor(fb.type)} text-xs gap-1`}>
                                {getFeedbackTypeIcon(fb.type)}
                                {getFeedbackTypeLabel(fb.type)}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{fb.content}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`${getFeedbackStatusColor(fb.status)} text-xs gap-1`}>
                              {getFeedbackStatusIcon(fb.status)}
                              {getFeedbackStatusLabel(fb.status)}
                            </Badge>
                            <Badge variant="outline" className={`${getPriorityColor(fb.priority)} text-xs`}>
                              {getPriorityLabel(fb.priority)}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatDateTime(fb.createdAt)}
                            </span>
                          </div>
                          {fb.adminReply && (
                            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Reply className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-xs font-medium text-emerald-700">
                                  Phản hồi từ {fb.replier?.name || 'Admin'}
                                </span>
                              </div>
                              <p className="text-sm text-emerald-800">{fb.adminReply}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

// ==================== ADMIN MODE ====================
function AdminFeedbackPanel({ userId }: { userId: string }) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Detail dialog
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [updating, setUpdating] = useState(false)

  const fetchFeedbacks = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus)
      if (filterType && filterType !== 'all') params.set('type', filterType)
      if (filterPriority && filterPriority !== 'all') params.set('priority', filterPriority)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/feedback?${params}`)
      if (res.ok) {
        const data = await res.json()
        setFeedbacks(data.feedbacks)
        setTotalPages(data.pagination.totalPages)
        if (data.stats) setStats(data.stats)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, filterType, filterPriority, searchQuery])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFeedbacks()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchFeedbacks])

  const handleReply = async () => {
    if (!selectedFeedback || !replyText.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi')
      return
    }
    setReplying(true)
    try {
      const res = await csrfFetch(`/api/feedback/${selectedFeedback.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminReply: replyText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Phản hồi thất bại')
      toast.success('Đã gửi phản hồi thành công!')
      setReplyText('')
      setSelectedFeedback(data.feedback)
      await fetchFeedbacks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Phản hồi thất bại')
    } finally {
      setReplying(false)
    }
  }

  const handleStatusChange = async (feedbackId: string, newStatus: string) => {
    setUpdating(true)
    try {
      const res = await csrfFetch(`/api/feedback/${feedbackId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Cập nhật thất bại')
      toast.success('Đã cập nhật trạng thái!')
      if (selectedFeedback?.id === feedbackId) {
        setSelectedFeedback(data.feedback)
      }
      await fetchFeedbacks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Cập nhật thất bại')
    } finally {
      setUpdating(false)
    }
  }

  const handlePriorityChange = async (feedbackId: string, newPriority: string) => {
    setUpdating(true)
    try {
      const res = await csrfFetch(`/api/feedback/${feedbackId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Cập nhật thất bại')
      toast.success('Đã cập nhật mức ưu tiên!')
      if (selectedFeedback?.id === feedbackId) {
        setSelectedFeedback(data.feedback)
      }
      await fetchFeedbacks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Cập nhật thất bại')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Tổng cộng</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
                </div>
                <MessageSquareWarning className="h-6 w-6 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-400">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Chờ xử lý</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Đang xử lý</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
                <Loader2 className="h-6 w-6 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-400">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Đã giải quyết</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.resolved}</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Bộ lọc</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                <SelectItem value="IN_PROGRESS">Đang xử lý</SelectItem>
                <SelectItem value="RESOLVED">Đã giải quyết</SelectItem>
                <SelectItem value="CLOSED">Đã đóng</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="FEEDBACK">Phản hồi</SelectItem>
                <SelectItem value="COMPLAINT">Khiếu nại</SelectItem>
                <SelectItem value="SUGGESTION">Gợi ý</SelectItem>
                <SelectItem value="BUG_REPORT">Báo lỗi</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={(v) => { setFilterPriority(v); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Mức ưu tiên" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả mức</SelectItem>
                <SelectItem value="LOW">Thấp</SelectItem>
                <SelectItem value="MEDIUM">Trung bình</SelectItem>
                <SelectItem value="HIGH">Cao</SelectItem>
                <SelectItem value="URGENT">Khẩn cấp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 p-4 border rounded-lg">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      ) : feedbacks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquareWarning className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Không có phản hồi nào</p>
            <p className="text-sm mt-1">Chưa có phản hồi nào phù hợp với bộ lọc</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">STT</TableHead>
                      <TableHead>Người gửi</TableHead>
                      <TableHead>Tiêu đề</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Ưu tiên</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày gửi</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedbacks.map((fb, idx) => (
                      <TableRow
                        key={fb.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedFeedback(fb)}
                      >
                        <TableCell className="text-muted-foreground text-sm">
                          {(page - 1) * 10 + idx + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{fb.user.name}</p>
                            <p className="text-xs text-muted-foreground">{fb.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="font-medium text-sm truncate">{fb.subject}</p>
                          <p className="text-xs text-muted-foreground truncate">{fb.content}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${getFeedbackTypeColor(fb.type)} text-xs gap-1`}>
                            {getFeedbackTypeIcon(fb.type)}
                            {getFeedbackTypeLabel(fb.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${getPriorityColor(fb.priority)} text-xs`}>
                            {getPriorityLabel(fb.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${getFeedbackStatusColor(fb.status)} text-xs gap-1`}>
                            {getFeedbackStatusIcon(fb.status)}
                            {getFeedbackStatusLabel(fb.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(fb.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedFeedback(fb)
                            }}
                          >
                            Chi tiết
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {feedbacks.map((fb) => (
              <Card
                key={fb.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedFeedback(fb)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm truncate">{fb.subject}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{fb.user.name} &middot; {fb.user.email}</p>
                    </div>
                    <Badge variant="outline" className={`${getFeedbackStatusColor(fb.status)} text-xs shrink-0 gap-1`}>
                      {getFeedbackStatusIcon(fb.status)}
                      {getFeedbackStatusLabel(fb.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{fb.content}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`${getFeedbackTypeColor(fb.type)} text-xs gap-1`}>
                      {getFeedbackTypeIcon(fb.type)}
                      {getFeedbackTypeLabel(fb.type)}
                    </Badge>
                    <Badge variant="outline" className={`${getPriorityColor(fb.priority)} text-xs`}>
                      {getPriorityLabel(fb.priority)}
                    </Badge>
                    {fb.adminReply && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-xs gap-1">
                        <Reply className="h-3 w-3" />
                        Đã trả lời
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDateTime(fb.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => { if (!open) setSelectedFeedback(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <MessageSquareWarning className="h-5 w-5 text-emerald-600" />
                  Chi tiết phản hồi
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Subject & Info */}
                <div>
                  <h3 className="font-semibold text-base">{selectedFeedback.subject}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bởi <span className="font-medium">{selectedFeedback.user.name}</span>
                    {' '}({selectedFeedback.user.email}) &middot; {formatDateTime(selectedFeedback.createdAt)}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`${getFeedbackTypeColor(selectedFeedback.type)} gap-1`}>
                    {getFeedbackTypeIcon(selectedFeedback.type)}
                    {getFeedbackTypeLabel(selectedFeedback.type)}
                  </Badge>
                  <Badge variant="outline" className={`${getFeedbackStatusColor(selectedFeedback.status)} gap-1`}>
                    {getFeedbackStatusIcon(selectedFeedback.status)}
                    {getFeedbackStatusLabel(selectedFeedback.status)}
                  </Badge>
                  <Badge variant="outline" className={getPriorityColor(selectedFeedback.priority)}>
                    {getPriorityLabel(selectedFeedback.priority)}
                  </Badge>
                </div>

                {/* Content */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{selectedFeedback.content}</p>
                </div>

                {/* Admin Reply */}
                {selectedFeedback.adminReply && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Reply className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">
                        Phản hồi từ {selectedFeedback.replier?.name || 'Admin'}
                      </span>
                    </div>
                    <p className="text-sm text-emerald-800 whitespace-pre-wrap">{selectedFeedback.adminReply}</p>
                  </div>
                )}

                {/* Status & Priority Controls */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Thay đổi trạng thái</Label>
                    <Select
                      value={selectedFeedback.status}
                      onValueChange={(v) => handleStatusChange(selectedFeedback.id, v)}
                      disabled={updating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                        <SelectItem value="IN_PROGRESS">Đang xử lý</SelectItem>
                        <SelectItem value="RESOLVED">Đã giải quyết</SelectItem>
                        <SelectItem value="CLOSED">Đã đóng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Thay đổi ưu tiên</Label>
                    <Select
                      value={selectedFeedback.priority}
                      onValueChange={(v) => handlePriorityChange(selectedFeedback.id, v)}
                      disabled={updating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Thấp</SelectItem>
                        <SelectItem value="MEDIUM">Trung bình</SelectItem>
                        <SelectItem value="HIGH">Cao</SelectItem>
                        <SelectItem value="URGENT">Khẩn cấp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Reply Form */}
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Reply className="h-4 w-4" />
                    Phản hồi
                  </Label>
                  <Textarea
                    placeholder="Nhập nội dung phản hồi..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={handleReply}
                    disabled={replying || !replyText.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    {replying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Gửi phản hồi
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== MAIN COMPONENT ====================
export default function FeedbackPanel({ userId, userRole }: FeedbackPanelProps) {
  if (userRole === 'ADMIN') {
    return <AdminFeedbackPanel userId={userId} />
  }
  return <UserFeedbackPanel userId={userId} />
}
