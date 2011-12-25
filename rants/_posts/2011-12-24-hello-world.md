---
layout: post
title: The Jekyll Switcheroo
image: /img/preview/jekyll-small.png
description: Rants on my switch to Jekyll as a blogging platform and other goodies
---

Intro
------

This post serves to be a test placeholder, but also a good start of a
blog post.

![Jekyll](/img/jekyll.png)

I've been blogging on posterous for a little bit and I must say that
using [Jekyll](http://jekyllrb.com/) is a pretty refreshing experience. There are quite a few
reasons I switched, and I know there are a LOT of resources out there
already documenting how to use/switch to Jekyll. I'll add those below
for a reference for anyone curious.

Here are the reasons why I've switched to Jekyll.

Complete Control Over my Site
---------------------------------
On Posterous custom designs would be a pain in the butt as you would be
stuck in a sandbox environment and the hassle of learning any templating
would require a bit more work. Yes, it's still CSS but it's not quite as
natural as building it yourself. Albeit, Jekyll uses a variety of
templating languages, but you can customize them yourself and I
personally enjoy using Markdown.

The main point is that as a developer, I have a pretty specific use case
versus someone who would simply use Tumblr or Posterous for quick
blogging, especially given that there are quite a few nice pre-built
themes. Furthermore, I'm not quite sure where Posterous was going with
spaces.

You get to express your feelings the best in something you've created
yourself and I think that's pretty important.

Developer Friendliness
---------------------------------
I'm currently writing Markdown in Vim to write a post... 'nuff said.

But on that note, it's really good because it fits in to my work flow as
a developer. I LOVE editing my text in VIM over any "Rich Text Editor"
any day. Furthermore, it can be placed under source control, (i.e. -
git).

Want to publish a change?

{% highlight git %}
# Add the post, commit it and push!
  git add .
  git commit -m "Published my First Post!"
  git push origin
{% endhighlight %}

Something about that makes my inner nerd happy. :)

Cool Community and Free Hosting and a Quick Gotcha!
---------------------------------
It's open source and you can find it on [Github](https://github.com/mojombo/jekyll)!

Furthermore you can easily deploy it on to your Github pages... for
free! Buy a domain name for 10 bucks and you're all set! Awesome!

If you want a starting point, there are a TON of Jekyll blogs floating
on Github and you can give them a fork. [Octopress](https://github.com/imathis/octopress) 
seems to be a popular choice, among others.

One more issue that I ran in to was that I had issues with syntax
highlighting. The reason for this was because I was using **Liquid
2.3** rather than **2.2**. So keep that in mind if you run in to an issue with
code highlighting!

Resources
---------------------------------
Have I done a good enough job to convince you to give it a try? Well
here are some resources that have helped me a lot:

1. [Envy Labs Tutorial] (http://blog.envylabs.com/2009/08/publishing-a-blog-with-github-pages-and-jekyll/)
2. [NetTuts Tutorial] (http://net.tutsplus.com/tutorials/other/building-static-sites-with-jekyll/)
3. [Main Page] (http://tom.preston-werner.com/jekyll/)
4. [Tom Preston Werner's Blog] (https://github.com/mojombo/mojombo.github.com)
5. [My Blog :)] (https://github.com/jkao/jkao.github.com)

Give them a look and maybe a shout. :)

If you enjoyed my article you can follow me on Twitter [@j_ckao](twitter.com/#!/j_ckao)
or connect with me with my links on the side.
