"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const auth_module_1 = require("../auth/auth.module");
const conversation_schema_1 = require("./schemas/conversation.schema");
const message_schema_1 = require("./schemas/message.schema");
const chat_controller_1 = require("./chat.controller");
const chat_gateway_1 = require("./chat.gateway");
const chat_service_1 = require("./chat.service");
const product_schema_1 = require("../products/schemas/product.schema");
const user_schema_1 = require("../users/schemas/user.schema");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            mongoose_1.MongooseModule.forFeature([
                { name: conversation_schema_1.Conversation.name, schema: conversation_schema_1.ConversationSchema },
                { name: message_schema_1.Message.name, schema: message_schema_1.MessageSchema },
                { name: product_schema_1.Product.name, schema: product_schema_1.ProductSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
            ]),
        ],
        controllers: [chat_controller_1.ChatController],
        providers: [chat_service_1.ChatService, chat_gateway_1.ChatGateway],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map