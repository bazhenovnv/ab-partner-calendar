import { Controller, Get, Query } from "@nestjs/common";
import { getFeed } from "./feed.service";

@Controller("feed")
export class FeedController {
  @Get()
  async get(@Query("chatId") chatId: string) {
    return getFeed(Number(chatId));
  }
}
