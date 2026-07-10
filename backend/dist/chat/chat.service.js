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
const product_schema_1 = require("../products/schemas/product.schema");
const user_schema_1 = require("../users/schemas/user.schema");
let ChatService = class ChatService {
    conversationModel;
    messageModel;
    productModel;
    userModel;
    constructor(conversationModel, messageModel, productModel, userModel) {
        this.conversationModel = conversationModel;
        this.messageModel = messageModel;
        this.productModel = productModel;
        this.userModel = userModel;
    }
    async getConversations() {
        return this.conversationModel
            .find()
            .populate('customerId', 'name email')
            .populate('productId', 'name imageUrl')
            .sort({ lastMessageAt: -1 })
            .lean();
    }
    async getConversationThread(conversationId) {
        const conversation = await this.conversationModel.findById(conversationId).lean();
        const messages = await this.messageModel.find({ conversationId: new mongoose_2.Types.ObjectId(conversationId) }).sort({ createdAt: 1 }).lean();
        return { conversation, messages };
    }
    async createConversation(customerId, productId) {
        const existing = await this.conversationModel.findOne({ customerId, productId });
        if (existing) {
            return existing;
        }
        const created = await this.conversationModel.create({
            customerId,
            productId,
            status: 'open',
            lastMessageAt: new Date(),
            lastMessagePreview: 'Conversation started',
            unreadCountForAgent: 1,
            unreadCountForCustomer: 0,
        });
        return created;
    }
    async createMessage(input) {
        const message = await this.messageModel.create({
            conversationId: new mongoose_2.Types.ObjectId(input.conversationId),
            senderId: new mongoose_2.Types.ObjectId(input.senderId),
            senderRole: input.senderRole,
            content: input.content,
            status: input.status ?? 'sent',
        });
        await this.conversationModel.findByIdAndUpdate(input.conversationId, {
            lastMessageAt: new Date(),
            lastMessagePreview: input.content,
            unreadCountForAgent: input.senderRole === 'customer' ? 1 : 0,
            unreadCountForCustomer: input.senderRole === 'agent' ? 1 : 0,
        });
        return message;
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(conversation_schema_1.Conversation.name)),
    __param(1, (0, mongoose_1.InjectModel)(message_schema_1.Message.name)),
    __param(2, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __param(3, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], ChatService);
//# sourceMappingURL=chat.service.js.map