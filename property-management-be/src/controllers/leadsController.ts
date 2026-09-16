import { Request, Response } from 'express';
import { resetAgentSession } from '../lib/agentClient';
import { listLeads, toggleLeadAgent } from '../services/leadsService';
import { emitConversationUpdated } from '../socket/server';
import { LeadStatus } from '../types';

export const getLeadsController = async (req: Request, res: Response): Promise<void> => {
  const result = await listLeads({
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    status: req.query.status as LeadStatus | undefined,
    search: req.query.search as string | undefined,
  });
  res.status(200).json({ success: true, data: result });
};

export const toggleLeadAgentController = async (req: Request, res: Response): Promise<void> => {
  const result = await toggleLeadAgent(req.params.id as string);

  if (result.agent_enabled) {
    await resetAgentSession(result.conversation.phone);
  }

  emitConversationUpdated(result.conversation);
  res.status(200).json({ success: true, data: result });
};
