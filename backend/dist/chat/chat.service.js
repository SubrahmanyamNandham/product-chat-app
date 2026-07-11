"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const conversation_schema_1 = require("./schemas/conversation.schema");
const message_schema_1 = require("./schemas/message.schema");
const products_service_1 = require("../products/products.service");
const MESSAGE_PAGE_SIZE = 30;
let ChatService = class ChatService {
    conversationModel;
    messageModel;
    productsService;
    constructor(conversationModel, messageModel, productsService) {
        this.conversationModel = conversationModel;
        this.messageModel = messageModel;
        this.productsService = productsService;
    }
    async findOrCreateConversation(customerId, productId) {
        await this.productsService.findById(productId);
        const existing = await this.conversationModel
            .findOne({ customerId: new mongoose_2.Types.ObjectId(customerId), productId: new mongoose_2.Types.ObjectId(productId) })
            .populate('productId')
            .exec();
        if (existing) {
            return existing;
        }
        try {
            const created = await this.conversationModel.create({
                customerId: new mongoose_2.Types.ObjectId(customerId),
                productId: new mongoose_2.Types.ObjectId(productId),
            });
            return created.populate('productId');
        }
        catch (err) {
            const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
            if (code === 11000) {
                const race = await this.conversationModel
                    .findOne({ customerId: new mongoose_2.Types.ObjectId(customerId), productId: new mongoose_2.Types.ObjectId(productId) })
                    .populate('productId')
                    .exec();
                if (race)
                    return race;
            }
            throw err;
        }
    }
    async listForCustomer(customerId) {
        return this.conversationModel
            .find({ customerId: new mongoose_2.Types.ObjectId(customerId) })
            .populate('productId')
            .sort({ lastMessageAt: -1 })
            .exec();
    }
    async listForAgentInbox() {
        return this.conversationModel
            .find()
            .populate('productId')
            .populate('customerId', 'name email')
            .sort({ lastMessageAt: -1 })
            .exec();
    }
    async getConversationOrThrow(conversationId) {
        const conversation = await this.conversationModel
            .findById(conversationId)
            .populate('productId')
            .populate('customerId', 'name email')
            .exec();
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        return conversation;
    }
    async assertParticipant(conversationId, userId, role) {
        const conversation = await this.getConversationOrThrow(conversationId);
        if (role === 'agent') {
            return conversation;
        }
        if (conversation.customerId._id.toString() !== userId) {
            throw new common_1.ForbiddenException('You do not have access to this conversation');
        }
        return conversation;
    }
    async getMessages(conversationId, before) {
        const query = { conversationId: new mongoose_2.Types.ObjectId(conversationId) };
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }
        const messages = await this.messageModel
            .find(query)
            .sort({ createdAt: -1 })
            .limit(MESSAGE_PAGE_SIZE)
            .exec();
        return messages.reverse();
    }
    async createMessage(conversationId, senderId, senderRole, content) {
        const conversation = await this.getConversationOrThrow(conversationId);
        const message = await this.messageModel.create({
            conversationId: new mongoose_2.Types.ObjectId(conversationId),
            senderId: new mongoose_2.Types.ObjectId(senderId),
            senderRole,
            content,
            status: 'sent',
        });
        conversation.lastMessageAt = message.createdAt ?? new Date();
        conversation.lastMessagePreview = content.slice(0, 120);
        if (senderRole === 'customer') {
            conversation.unreadCountForAgent += 1;
            conversation.status = 'open';
        }
        else {
            conversation.unreadCountForCustomer += 1;
            if (!conversation.agentId) {
                conversation.agentId = new mongoose_2.Types.ObjectId(senderId);
            }
        }
        await conversation.save();
        return { message, conversation };
    }
    async markRead(conversationId, viewerRole) {
        const conversation = await this.getConversationOrThrow(conversationId);
        const otherRole = viewerRole === 'agent' ? 'customer' : 'agent';
        const now = new Date();
        await this.messageModel.updateMany({ conversationId, senderRole: otherRole, status: { $in: ['sent', 'delivered'] } }, { $set: { status: 'read', readAt: now } });
        if (viewerRole === 'agent') {
            conversation.unreadCountForAgent = 0;
        }
        else {
            conversation.unreadCountForCustomer = 0;
        }
        await conversation.save();
        return conversation;
    }
    async markDelivered(conversationId, viewerRole) {
        const otherRole = viewerRole === 'agent' ? 'customer' : 'agent';
        const now = new Date();
        const result = await this.messageModel.updateMany({ conversationId, senderRole: otherRole, status: 'sent' }, { $set: { status: 'delivered', deliveredAt: now } });
        return result.modifiedCount;
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(conversation_schema_1.Conversation.name)),
    __param(1, (0, mongoose_1.InjectModel)(message_schema_1.Message.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        products_service_1.ProductsService])
], ChatService);
//# sourceMappingURL=chat.service.js.map