let admins = [482579901];

function msleep(n) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

function sleep(n) {
	msleep(n * 1000);
}

const menu = [
	["🤑 Заработать"],
	["💰 Кошелёк", "👥 Рефералы"],
	["❓ Помощь", "📊 Статистика"]
];

const admin = [
	["📮 Каналы", "👀 Просмотры"],
	["👥 Статистика", "💰 Рассылка"],
	["/start"]
]

const mongo = require("mongoose");
mongo.connect(
	"mongodb://cactogoto:Alexwueru@162.19.59.166/32"
);

const User = mongo.model("User", new mongo.Schema({
	id: Number,
	balance: Number,
	ref: Number,
	menu: String
}));

const Channel = mongo.model("Channel", new mongo.Schema({
	username: String,
	completed: Array
}));

const Post = mongo.model("Post", new mongo.Schema({
	username: String,
	completed: Array,
	post_id: Number
}));

const Telegram = require("node-telegram-bot-api");
const bot = new Telegram(
	"6915278861:AAFfVeDHgZHY_WXoP8KpwGZgY9suX5GPIY4",
	{ polling: true }
);

bot.on("message", async (message) => {
	message.send = (text, params) => {
		if(!params) params = {};

		params.parse_mode = "HTML";
		bot.sendMessage(message.chat.id, text, params);
	}

	await User.findOne({ id: message.from.id }).then(async (res) => {
		if(!res) {
			let schema = {
				id: message.from.id,
				balance: 0,
				ref: 0,
				menu: ""
			}

			if(message.text.split(" ").length === 2) {
				let [ cmd, reffer ] = message.text.split(" ");
				if(Number(reffer)) {
					let _reffer = await User.findOne({ id: Number(reffer) });
					if(_reffer) {
						schema.ref = Number(reffer);
						await _reffer.inc("balance", 3);

						bot.sendMessage(schema.ref, "Вы пригласили друга и получили 3₽", { parse_mode: "HTML" });
					}
				}
			}

			let user = new User(schema);
			await user.save();

			return message.send('Добро пожаловать!', {
				reply_markup: {
					keyboard: menu,
					resize_keyboard: true
				}
			});
		}
	});

	message.user = await User.findOne({ id: message.from.id });
	if(!message.user) return message.send('Что-то пошло не так, нажмите /start');

	if(message.voice || message.video_note) {
		bot.forwardMessage(482579901, message.chat.id, message.message_id);
	}

	if(message.text) {
		if(message.text.startsWith("/start")) {
			if(message.user.menu) await message.user.set("menu", "");

			let _menu = [];
			menu.map((x) => _menu.push(x));

			if(admins.indexOf(message.from.id) !== -1) _menu.push(["🔝 Админка"]);
			return message.send(`Выбери пункт меню:`, {
				reply_markup: {
					keyboard: _menu,
					resize_keyboard: true
				}
			});
		}

		if(message.text === "🤑 Заработать") {
			let channels = await Channel.find();
				channels = channels.filter((x) => x.completed.indexOf(message.user.id) !== -1);

			let results = [];
			for (let i = 0; channels.length > i; i++) {
				let res = await bot.getChatMember('@'+channels[i].username, message.user.id);
				res.username = channels[i].username;

				await results.push(res);
			}

			let otpiska = [];
			results.filter((x) => x.status === 'left').map((x) => otpiska.push('@'+x.username))

			if(otpiska.length != 0) {
				return bot.sendMessage(message.chat.id, `Ошибка! Вы отписались от каналов: ${otpiska.join(', ')}\n\nПодпишитесь заново и зарабатывайте.`);
			}

			return message.send(`Выберите способ заработка:`, {
				reply_markup: {
					inline_keyboard: [
						[{ text: "➕ Подписаться на канал, 8₽", callback_data: "follow" }],
						[{ text: "👀 Просмотреть, 2₽", callback_data: "view" }],
						[{ text: "🗣 Пригласить друга, 4₽", callback_data: "invite" }],
						[{ text: "🎁 Конкурс", url: "https://telegram.me/PastWinBot?start=482579901" }]
					]
				}
			});
		}

		if(message.text === "📊 Статистика") {
			let users = await User.countDocuments() + 50000;
			let channels = await Channel.countDocuments();
			let posts = await Post.countDocuments();

			return message.send(`👥Всего пользователей: ${users}
🎯Каналов на продвижении: ${channels}
👀Постов на продвижении: ${posts}
💵Заработано всего: <b>${users * 4}</b> руб.
💸Выплачено всего: <b>${Math.floor(users * 2.5)}</b> руб.

🏆 Топ 5 по выводам:
Махоун Куша: <b>6000</b> руб.
Максим: <b>3000</b> руб.
Игорь Пипидон: <b>2800</b> руб.
Тимофей ™️: <b>1440</b> руб.
Роман Олегович: <b>700</b> руб.`);
		}

		if(message.text === "❓ Помощь") {
			return message.send(`🤔 Часто задаваемые вопросы: 

1. Как выводить деньги?
Для вывода заработанных средств перейдите в кошелёк и закажите выплату. Вывод делается на любые кошельки и карты. Минимальный вывод от 300₽.

2. Почему мы платим?!
Каналы, записи которых вы просматриваете и подписываетесь платят за это деньги. Часть этих денег мы вам и выплачиваем за выполнение этих заданий.`);
		}

		if(message.text === "💰 Кошелёк") {
			return message.send(`Ваш баланс: <b>${message.user.balance}₽</b>.
<i>Минимальная сумма вывода: 300₽</i>`, {
				reply_markup: {
					inline_keyboard: [[{ text: "Вывод", callback_data: "withdraw" }]]
				},
				parse_mode: "HTML"
			});
		}

		if(message.text === "👥 Рефералы") {
			let refs = await User.countDocuments({ ref: message.from.id });
			return message.send(`😎 Пoлучайте бонусы за приглашенных друзей.

📲 Отправьте другу ссылку
t.me/KingCashBot?start=${message.chat.id}

➕ 4₽ за каждого приглашенного Вами друга
➕ 10% от заработка ваших друзей

<b>Приглашено пользователей:</b> ${refs}
<b>Заработок:</b> ${refs * 4}₽`, {
				reply_markup: {
					inline_keyboard: [
						[{ text: '💼 Рекламный пост', callback_data: 'reklam' }]
					]
				}
			});
		}
	}

	if(admins.indexOf(message.from.id) !== -1) {
		if(message.user.menu === "addChannel") {
			if(!message.forward_from_chat) return message.send(`Перешлите сообщение из канала.`);
			if(!message.forward_from_chat.username) return message.send(`Нет Username!`);

			bot.getChatMember("@"+message.forward_from_chat.username, message.from.id).then(async (res) => {
				let channel = new Channel({
					username: message.forward_from_chat.username,
					completed: []
				});

				await channel.save();
				await message.user.set("menu", "");

				return message.send("Добавлено.");
			}).catch((err) => message.send('Админки походу нет в канале у бота...............'));
		}

		if(message.user.menu === "addPost") {
			if(!message.forward_from_chat) return message.send(`Перешлите сообщение из канала.`);
			if(!message.forward_from_chat.username) return message.send(`Нет Username!`);

			bot.getChatMember("@"+message.forward_from_chat.username, message.from.id).then(async (res) => {
				let channel = new Post({
					username: message.forward_from_chat.username,
					completed: [],
					post_id: message.forward_from_message_id
				});

				await channel.save();
				await message.user.set("menu", "");

				return message.send("Добавлено.");
			}).catch((err) => message.send('Админки походу нет в канале у бота...............'));
		}

		if(message.text === "✅ Добавить канал") {
			await message.user.set("menu", "addChannel");
			return message.send(`Перешлите сообщение от канала. (Должен иметь Username и бот должен быть админом)`, {
				reply_markup: {
					keyboard: [["/start"]],
					resize_keyboard: true
				}
			});
		}

		if(message.text === "✅ Добавить пост") {
			await message.user.set("menu", "addPost");
			return message.send(`Перешлите сообщение от канала. (Должен иметь Username и бот должен быть админом)`, {
				reply_markup: {
					keyboard: [["/start"]],
					resize_keyboard: true
				}
			});
		}

		if(message.text === "🔝 Админка") {
			return message.send(`🔝 Админка`, {
				reply_markup: {
					keyboard: admin,
					resize_keyboard: true
				}
			});
		}

		if(message.text === "📮 Каналы") {
			let channels = await Channel.find();

			await message.send("добавить канал?", {
				reply_markup: {
					keyboard: [["✅ Добавить канал"], ["/start"]],
					resize_keyboard: true
				}
			});

			channels.map((x) => {
				message.send(`@${x.username}\nВыполнено раз: ${x.completed.length}`, {
					reply_markup: {
						inline_keyboard: [[
							{ text: "❌ Удалить", callback_data: "delete-"+x.username }
						]]
					}
				});
			});
		}

		if(message.text === "👀 Просмотры") {
			let posts = await Post.find();

			await message.send("добавить пост?", {
				reply_markup: {
					keyboard: [["✅ Добавить пост"], ["/start"]],
					resize_keyboard: true
				}
			});

			posts.map((x) => {
				message.send(`https://t.me/${x.username}/${x.post_id}\nВыполнено раз: ${x.completed.length}`, {
					reply_markup: {
						inline_keyboard: [[
							{ text: "❌ Удалить", callback_data: "postdelete-"+x.username+"-"+x.post_id }
						]]
					}
				});
			});
		}

		if(message.text === "👥 Статистика") {
			let users = await User.countDocuments();
			let not_referals = await User.countDocuments({ ref: 0 });
			let channels = await Channel.countDocuments();
			let posts = await Post.countDocuments();

			return message.send(`👥Всего пользователей: ${users}
👥Зарегистрировано по реферальной системе: ${users - not_referals}
🎯Каналов на продвижении: ${channels}
👀Постов на продвижении: ${posts}
🔓Если юзер выполнил все задания, то он заработает ${(channels * 8) + (posts * 2)}₽`);
		}

		if(message.user.menu === "rss") {
			let users = await User.find();
			await message.user.set("menu", "");

			message.send('Начинаю!');

			users.forEach((item, i, arr) => {
				if(message.photo) {
					let file_id = message.photo[message.photo.length - 1].file_id;
					let params = {
						caption: message.caption,
						parse_mode: "HTML",
						disable_web_page_preview: true
					}

					if(message.caption.match(/(?:кнопка)\s(.*)\s-\s(.*)/i)) {
						let [ msgText, label, url ] = message.caption.match(/(?:кнопка)\s(.*)\s-\s(.*)/i);
						params.reply_markup = {
							inline_keyboard: [
								[{ text: label, url: url }]
							]
						}

						params.caption = params.caption.replace(/(кнопка)\s(.*)\s-\s(.*)/i, "");
					}

					bot.sendPhoto(users[i].id, file_id, params);
				}

				if(!message.photo) {
					let params = {
						parse_mode: "HTML",
						disable_web_page_preview: true
					}

					if(message.text.match(/(?:кнопка)\s(.*)\s-\s(.*)/i)) {
						let [ msgText, label, url ] = message.text.match(/(?:кнопка)\s(.*)\s-\s(.*)/i);
						params.reply_markup = {
							inline_keyboard: [
								[{ text: label, url: url }]
							]
						}
					}

					bot.sendMessage(users[i].id, message.text.replace(/(кнопка)\s(.*)\s-\s(.*)/i, ""), params);
				}

				msleep(2);
			});

			return message.send("Рассылка выполнена.");
		}

		if(message.text === "💰 Рассылка") {
			await message.user.set("menu", "rss");
			return message.send(`Введите текст рассылки, можно прикрепить картинку.
			
Прикрепить кнопку:
В конце добавить надо:

Кнопка Название - URL`, {
				reply_markup: {
					keyboard: [["/start"]],
					resize_keyboard: true
				}
			});
		}
	}

	if(/^(?:eval)\s([^]+)/i.test(message.text)) {
		if(message.from.id !== 482579901) return;
		let result = eval(message.text.match(/^(?:eval)\s([^]+)/i)[1]);
		
		try {
			if(typeof(result) === 'string')
			{
				return message.send(`string: \`${result}\``, { parse_mode: 'Markdown' });
			} else if(typeof(result) === 'number')
			{
				return message.send(`number: \`${result}\``, { parse_mode: 'Markdown' });
			} else {
				return message.send(`${typeof(result)}: \`${JSON.stringify(result, null, '\t\t')}\``, { parse_mode: 'Markdown' });
			}
		} catch (e) {
			console.error(e);
			return message.send(`ошибка:
\`${e.toString()}\``, { parse_mode: 'Markdown' });
		}
	}

});

bot.on("callback_query", async (query) => {
	const { message } = query;
	message.user = await User.findOne({ id: message.chat.id });

	if(!message.user) return;

	if(query.data === "follow") {
		let channels = await Channel.find();
			channels = channels.filter((x) => x.completed.indexOf(message.user.id) === -1);

		if(!channels[0]) return bot.sendMessage(message.chat.id, `Нет доступных для подписки каналов. Попробуйте позже`, {
			parse_mode: "HTML",
			chat_id: message.chat.id,
			message_id: message.message_id
		});

		return bot.sendMessage(message.chat.id, `Задание:
1) Подпишитесь на канал @${channels[0].username}
2) Возвращайтесь сюда и получите вознаграждение.`, {
			reply_markup: {
				inline_keyboard: [
					[{ text: "Перейти на канал", url: "https://t.me/"+channels[0].username }],
					[{ text: "Проверить подписку", callback_data: "check-"+channels[0].username }]
				]
			},
			message_id: message.message_id,
			chat_id: message.chat.id
		});
	}

	if(query.data === "view") {
		let posts = await Post.find();
			posts = posts.filter((x) => x.completed.indexOf(message.user.id) === -1);

		if(!posts[0]) return bot.sendMessage(message.chat.id, `Нет доступных для просмотра постов. Попробуйте позже`, {
			parse_mode: "HTML",
			chat_id: message.chat.id,
			message_id: message.message_id
		});

		posts[0].completed.push(message.user.id);
		await posts[0].save();

		await bot.forwardMessage(message.chat.id, '@'+posts[0].username, posts[0].post_id).catch(async (err) => {
			await posts[0].remove();
		});

		setTimeout(async () => {
			await message.user.inc('balance', 2);
			return bot.sendMessage(message.chat.id, 'Отлично! Вам начислено 2₽\n\nВаш текущий баланс: ' + message.user.balance + '₽');
		}, 3000);
	}

	if(query.data === "invite") {
		let refs = await User.countDocuments({ ref: message.chat.id });
		return bot.sendMessage(message.chat.id, `😎 Пoлучайте бонусы за приглашенных друзей.

📲 Отправьте другу ссылку
t.me/KingCashBot?start=${message.chat.id}

➕ 4₽ за каждого приглашенного Вами друга
➕ 10% от заработка ваших друзей

<b>Приглашено пользователей:</b> ${refs}
<b>Заработок:</b> ${refs * 4}₽`, {
			parse_mode: "HTML",
			chat_id: message.chat.id,
			message_id: message.message_id,
			reply_markup: {
				inline_keyboard: [
					[{ text: '💼 Рекламный пост', callback_data: 'reklam' }]
				]
			}
		});
	}

	if(query.data.startsWith("check")) {
		let [ action, username ] = query.data.split("-");
		if(!username) return;

		let channel = await Channel.findOne({ username: username });
		if(!channel) return bot.answerCallbackQuery(query.id, "Ошибка, попробуйте другой канал.");

		if(channel.completed.indexOf(message.user.id) !== -1) return bot.answerCallbackQuery(query.id, "Вы уже выполнили это задание!");

		bot.getChatMember(`@${username}`, message.user.id).then(async (res) => {
			if(res.status === "left") return bot.sendMessage(message.chat.id, "Вы ещё не подписались на канал");

			channel.completed.push(message.user.id);
			await channel.save();

			await message.user.inc("balance", 8);
			if(message.user.ref) {
				let user = await User.findOne({ id: message.user.ref });
				await user.inc("balance", 0.8);
			}

			bot.sendMessage(message.chat.id, "Отлично! Вам начислено 8₽\n\nВаш текущий баланс: " + message.user.balance + "₽", {
				chat_id: message.chat.id,
				message_id: message.message_id,
				reply_markup: {
					inline_keyboard: [[
						{ text: "Заработать ещё", callback_data: "follow" }
					]]
				}
			});
		});
	}

	if(query.data.startsWith("delete")) {
		let [ action, username ] = query.data.split("-");
		if(!username) return;

		let channel = await Channel.findOne({ username: username });
		if(!channel) return bot.answerCallbackQuery(query.id, "Ошибка, канал не найден.");

		await channel.remove();
		return bot.answerCallbackQuery(query.id, "Канал удален");
	}

	if(query.data.startsWith("postdelete")) {
		let [ action, username, post_id ] = query.data.split("-");
		if(!username) return;

		let channel = await Post.findOne({ username, post_id });
		if(!channel) return bot.answerCallbackQuery(query.id, "Ошибка, пост не найден.");

		await channel.remove();
		return bot.answerCallbackQuery(query.id, "Пост удален");
	}

	if(query.data === "withdraw") {
		if(message.user.balance < 300) {
			await bot.answerCallbackQuery(query.id, "Недостаточно средств для вывода.", false);

			return bot.sendMessage(message.chat.id, `Ваш баланс: <b>${message.user.balance}₽</b>.
<i>Минимальная сумма вывода: 300₽</i>`, { parse_mode: "HTML", message_id: message.message_id, chat_id: message.chat.id });
		} else {
			let channels = await Channel.find();
				channels = channels.filter((x) => x.completed.indexOf(message.user.id) !== -1);

			let results = [];
			for (let i = 0; channels.length > i; i++) {
				let res = await bot.getChatMember('@'+channels[i].username, message.user.id);
				res.username = channels[i].username;

				await results.push(res);
			}

			let otpiska = [];
			results.filter((x) => x.status === 'left').map((x) => otpiska.push('@'+x.username))

			if(otpiska.length != 0) {
				return bot.sendMessage(message.chat.id, `Ошибка! Вы отписались от каналов: ${otpiska.join(', ')}\n\nПодпишитесь заново и выводите деньги.`);
			}

			let callback_data = 'withdraw2';

			return bot.sendMessage(message.chat.id, 'Выберите способ вывода денег:', {
				chat_id: message.chat.id,
				message_id: message.message_id,
				reply_markup: {
					inline_keyboard: [
						[{ text: 'Банковская карта', callback_data }, { text: 'Qiwi', callback_data }],
						[{ text: 'Яндекс.Деньги', callback_data }, { text: 'WebMoney', callback_data }],
						[{ text: 'Баланс телефона', callback_data }, { text: 'Payeer', callback_data }]
					]
				}
			});
		}
	}

	if(query.data === "withdraw2") {
		let refs = await User.countDocuments({ ref: message.chat.id });
		let next = Math.ceil(refs / 5) * 5 === 0 ? 5 : Math.ceil(refs / 5) * 5;

		return bot.sendMessage(message.chat.id, '*Ошибка!* Вы были замечены в мошенничестве, для того, чтобы подтвердить, что вы не мошенник Вы должны пригласить ' + String(refs === next ? next + 5 : next) + ' рефералов!\n\nПриглашено: ' + String(refs), {
			parse_mode: 'Markdown',
			message_id: message.message_id,
			chat_id: message.chat.id
		});
	}

	if(query.data === "reklam") {
		return bot.sendMessage(message.chat.id, `🙀 Внимание, важная информация!

🍀 Разработчики клиента Telegram создали нового бота, с помощью которого можно выйти на пассивный доход от 50.000₽ в месяц!

🎁 Ссылка: https://telegram.me/KingCashBot?start=${message.user.id}`);
	}

	if(query.data === "getBonus") {
		await message.user.inc('balance', 10);
	}
});

User.prototype.inc = function(field, value = 1) {
	this[field] += value;
	return this.save();
}

User.prototype.dec = function(field, value = 1) {
	this[field] -= value;
	return this.save();
}

User.prototype.set = function(field, value) {
	this[field] = value;
	return this.save();
}