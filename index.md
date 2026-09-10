---
layout: site
title: "Principal Engineer at Radar"
description: "Jeff Kao is a principal engineer at Radar with interests in music, languages, travel, and data. Find his engineering talks, articles, and social profiles."
author:
  name: "Jeff Kao"
  url: "https://jeffkao.ca/"
body_class: home-page
---

<section class="intro" aria-labelledby="intro-title">
  <nav class="home-address" aria-label="Breadcrumb">
    <a href="{{ '/' | relative_url }}">jeffkao.ca</a>
    <span aria-hidden="true">/</span>
    <a href="{{ '/' | relative_url }}" aria-label="Home" aria-current="page">~</a>
  </nav>
  <h1 id="intro-title">jeff kao</h1>
  <p class="lede">Principal engineer at <a href="https://radar.com/" rel="noopener noreferrer" target="_blank">Radar</a>.</p>
  <p>I'm interested in music, languages, travel, and data.</p>

  <div class="link-list" aria-label="Elsewhere">
    <a href="https://github.com/jkao" rel="me noopener noreferrer" target="_blank">GitHub</a>
    <a href="https://www.linkedin.com/in/jeffreykao/" rel="me noopener noreferrer" target="_blank">LinkedIn</a>
    <a href="https://twitter.com/j_ckao" rel="me noopener noreferrer" target="_blank">Twitter</a>
    <a href="/jeff-kao-resume.pdf" target="_blank" rel="noopener noreferrer">Résumé</a>
  </div>
</section>

<!--
<section class="section" aria-labelledby="writing-heading">
  <div class="section-heading">
    <h2 id="writing-heading">Writing</h2>
    <a class="quiet-link" href="/writing/" target="_blank" rel="noopener noreferrer">View all</a>
  </div>

  {% assign articles = site.writing | sort: "date" | reverse %}
  {% if articles.size > 0 %}
  <ol class="article-list">
    {% for article in articles limit: 4 %}
    <li>
      <a href="{{ article.url | relative_url }}" target="_blank" rel="noopener noreferrer">{{ article.title }}</a>
      <time datetime="{{ article.date | date_to_xmlschema }}">{{ article.date | date: "%b %-d, %Y" }}</time>
      {% if article.description %}<p>{{ article.description }}</p>{% endif %}
    </li>
    {% endfor %}
  </ol>
  {% else %}
  <p class="empty-state"></p>
  {% endif %}
</section>
-->

<section class="section" aria-labelledby="elsewhere-heading">
  <div class="section-heading">
    <h2 id="elsewhere-heading"><span class="comment-mark" aria-hidden="true">//</span> around the internet</h2>
  </div>

  <ul class="external-list">
    <li><a href="https://corrode.dev/podcast/s05e08-radar/" rel="noopener noreferrer" target="_blank">HorizonDB: a geocoder and geo-database in Rust</a></li>
    <li><a href="https://radar.com/blog/high-performance-geocoding-in-rust" rel="noopener noreferrer" target="_blank">Replacing Elasticsearch and MongoDB with Rust and RocksDB</a></li>
    <li><a href="https://archive.is/9S3d0" rel="noopener noreferrer" target="_blank">Open-sourcing our Node.js S2 library</a></li>
    <li><a href="https://archive.is/9Kzqn" rel="noopener noreferrer" target="_blank">Making clean code a priority</a></li>
    <li><a href="https://archive.ph/jTPGi" rel="noopener noreferrer" target="_blank">How Radar adopted Terraform CDK</a></li>
  </ul>
</section>
