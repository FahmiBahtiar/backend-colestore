"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var config_1 = require("prisma/config");
exports.default = (0, config_1.defineConfig)({
    earlyAccess: true,
    schema: 'prisma/schema.prisma',
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
