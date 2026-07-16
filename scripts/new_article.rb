#!/usr/bin/env ruby

require "date"
require "fileutils"
require "json"

title = ARGV.join(" ").strip
abort 'Usage: make new TITLE="My article title"' if title.empty?

slug = title
  .encode("ASCII", invalid: :replace, undef: :replace, replace: "")
  .downcase
  .gsub(/[^a-z0-9]+/, "-")
  .gsub(/\A-|\z-/, "")

abort "The title must contain at least one letter or number." if slug.empty?

FileUtils.mkdir_p("_writing")
path = File.join("_writing", "#{slug}.md")
abort "#{path} already exists." if File.exist?(path)

front_matter = <<~ARTICLE
  ---
  title: #{title.to_json}
  date: #{Date.today.iso8601}
  description: ""
  tags: []
  published: false
  ---

  Start writing here.
ARTICLE

File.write(path, front_matter)
puts "Created #{path}"
puts "Run `make drafts` to preview it. Change `published` to `true` when it is ready."
