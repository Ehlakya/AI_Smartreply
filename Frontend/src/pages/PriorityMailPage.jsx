import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { emailService } from '../services/email.service';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from 'use-debounce';
import { AlertCircle } from 'lucide-react';
import CategorizedEmailList from '../components/CategorizedEmailList';

export default function PriorityMailPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['priorityMail', user?._id, page, debouncedSearch],
    queryFn: () => emailService.getPriority(page, 20, debouncedSearch),
    keepPreviousData: true
  });

  const emails = data?.data?.emails || [];
  const totalPages = data?.data?.totalPages || 1;

  return (
    <CategorizedEmailList
      title="Priority Mail"
      icon={AlertCircle}
      emails={emails}
      isLoading={isLoading}
      isFetching={isFetching}
      page={page}
      totalPages={totalPages}
      setPage={setPage}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
    />
  );
}
