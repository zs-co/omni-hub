import axios from 'axios';
import { createClient } from '../utils/supabase';

interface MessageResponse {
    from: 'user' | 'bot'
    message: string
}
const supabase = createClient()

export const useMessage = {
    getOrCreateSessionId: () => {
        let sessionId = sessionStorage.getItem('session_id')
        if (!sessionId) {
            sessionId = crypto.randomUUID();
            sessionStorage.setItem('session_id', sessionId);
        }
        return sessionId; 
    },
    async send(message: string): Promise<MessageResponse> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const response = await axios.post('http://127.0.0.1:8000/ai/chat/finance', { query: message, user_id: user?.id, sessionId: this.getOrCreateSessionId() })
            return {
                from: 'bot',
                message: response.data.response
            }
        } catch (error) {
            return {
                from: 'bot',
                message: error as string
            }
        }
    },
    async fetch(session_id: string) {
        try {
            const { data, error } = await supabase
                .from('chat_history')
                .select('*')
                .eq('session_id', session_id)
                .order('id', { ascending: true })
                ;
            if (error) {
                console.error('Supabase fetch error (chat_history):', error);
                return [];
            }
            return data ?? [];
        } catch (error) {
            console.error('Unexpected error fetching chat_history:', error);
            return [];
        }
    }
} 