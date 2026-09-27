import type { Category, Topic, Sentence } from './types'

export const categories: Category[] = [
  { id: 'emotion', name: '情绪描写' }, { id: 'action', name: '动作描写' },
  { id: 'thought', name: '心理描写' }, { id: 'setting', name: '环境描写' },
  { id: 'interaction', name: '人物互动' }, { id: 'plot', name: '情节推进' },
  { id: 'resolution', name: '转折与解决' }, { id: 'ending', name: '结尾升华' },
]

const examples: [string, string, string, [string, string][]][] = [
  ['nervous', 'emotion', '紧张', [
    ['My heart pounded as I stepped forward.', '当我向前迈步时，我的心怦怦直跳。'],
    ['My palms were sweaty, and I could hardly say a word.', '我的手心冒汗，几乎说不出话来。'],
  ]],
  ['joy', 'emotion', '喜悦', [
    ['A bright smile spread across her face.', '她的脸上绽放出灿烂的笑容。'],
    ['To my great joy, all our efforts had finally paid off.', '令我欣喜的是，我们所有的努力终于得到了回报。'],
  ]],
  ['running', 'action', '奔跑', [
    ['Without hesitation, I rushed towards him.', '我毫不犹豫地向他冲去。'],
    ['She ran as fast as she could, calling my name.', '她一边喊着我的名字，一边拼命奔跑。'],
  ]],
  ['care', 'action', '细微动作', [
    ['He took a deep breath and slowly opened the door.', '他深吸一口气，慢慢打开了门。'],
    ['I held the letter tightly in my hands.', '我把信紧紧攥在手中。'],
  ]],
  ['courage', 'thought', '鼓起勇气', [
    ['I reminded myself that I had to give it a try.', '我提醒自己，我必须试一试。'],
    ['Gathering all my courage, I decided to take the first step.', '我鼓起全部勇气，决定迈出第一步。'],
  ]],
  ['regret', 'thought', '反思', [
    ['It was then that I realized how wrong I had been.', '直到那时，我才意识到自己错得多么离谱。'],
    ['His words kept ringing in my ears.', '他的话不断在我耳边回响。'],
  ]],
  ['sunlight', 'setting', '阳光', [
    ['The warm sunlight streamed through the window.', '温暖的阳光透过窗户照了进来。'],
    ['A gentle breeze brushed against my face.', '一阵微风轻拂过我的脸庞。'],
  ]],
  ['rain', 'setting', '风雨', [
    ['Dark clouds gathered, and rain began to fall.', '乌云聚集，雨开始落下。'],
    ['The wind howled as we made our way home.', '我们回家时，狂风呼啸着。'],
  ]],
  ['comfort', 'interaction', '安慰与支持', [
    ['She placed a hand on my shoulder and gave me an encouraging smile.', '她把手放在我的肩上，给了我一个鼓励的微笑。'],
    ['“You can do it,” he said in a gentle voice.', '“你能做到的。”他温柔地说。'],
  ]],
  ['thanks', 'interaction', '感谢', [
    ['I hugged her tightly, unable to express my thanks in words.', '我紧紧拥抱她，无法用语言表达感激。'],
    ['“Thank you for believing in me,” I whispered.', '“谢谢你相信我。”我轻声说。'],
  ]],
  ['discovery', 'plot', '发现', [
    ['Just then, a familiar voice caught my attention.', '就在那时，一个熟悉的声音引起了我的注意。'],
    ['As I looked around, I noticed a small box under the table.', '环顾四周时，我注意到桌子下面有一个小盒子。'],
  ]],
  ['effort', 'plot', '继续努力', [
    ['We worked together, refusing to give up.', '我们齐心协力，不肯放弃。'],
    ['Minutes passed, but there was still no sign of him.', '几分钟过去了，但仍然不见他的踪影。'],
  ]],
  ['turning', 'resolution', '转机', [
    ['Just when I was about to give up, an idea came to me.', '就在我即将放弃时，我想到了一个主意。'],
    ['To our relief, help finally arrived.', '令我们宽慰的是，援助终于到来了。'],
  ]],
  ['solved', 'resolution', '解决困难', [
    ['With his help, I finally managed to finish the task.', '在他的帮助下，我终于完成了任务。'],
    ['After several attempts, we found a way out.', '经过几次尝试，我们找到了出路。'],
  ]],
  ['growth', 'ending', '成长', [
    ['That day, I learned that courage means trying even when we are afraid.', '那天，我明白了勇气意味着即使害怕也愿意尝试。'],
    ['The experience taught me never to give up too easily.', '这次经历教会我不要轻易放弃。'],
  ]],
  ['kindness', 'ending', '善意', [
    ['A small act of kindness can make a big difference.', '一个小小的善举也能带来巨大的改变。'],
    ['The warmth of that moment would stay with me forever.', '那一刻的温暖将永远留在我的心中。'],
  ]],
]

export const topics: Topic[] = examples.map(([id, categoryId, name]) => ({ id, categoryId, name }))
export const sentences: Sentence[] = examples.flatMap(([topicId, categoryId, , pairs]) =>
  pairs.map(([english, chinese], index) => ({ id: `${topicId}-${index + 1}`, categoryId, topicId, english, chinese })),
)
