USE societynest;

-- Optional local demo data. These rows exist only to make the UI immediately testable.
INSERT INTO societies (name, category, tagline, description, criteria, roles, deadline)
VALUES
('CodeCraft', 'Technical', 'Build. Learn. Ship.', 'A technical community for students interested in software development, problem solving and peer learning.', 'Open to students interested in programming and technology.', 'Web Development, DSA, Backend', '2027-12-31 23:59:00'),
('Rhythm', 'Cultural', 'Create. Perform. Connect.', 'A cultural society for dance, music and stage performances.', 'Open to students with an interest in performing arts.', 'Dance, Music, Events', '2027-12-31 23:59:00'),
('FrameLab', 'Creative', 'Turn ideas into visuals.', 'A creative community around photography, design, video and visual storytelling.', 'Open to students interested in visual creativity.', 'Design, Photography, Video', '2027-12-31 23:59:00'),
('The Quill', 'Literary', 'Words with a point of view.', 'A literary community for writing, reading, speaking and thoughtful discussions.', 'Open to students who enjoy writing, reading or public speaking.', 'Writing, Editorial, Poetry', '2027-12-31 23:59:00'),
('Athletica', 'Sports', 'Play together. Grow together.', 'A student sports community focused on participation, teamwork and fitness.', 'Open to students interested in sports and team activities.', 'Football, Basketball, Athletics', '2027-12-31 23:59:00'),
('LaunchPad', 'Entrepreneurship', 'Ideas into action.', 'A student entrepreneurship community for founders, builders and business-minded learners.', 'Open to students interested in startups, business or innovation.', 'Marketing, Product, Operations', '2027-12-31 23:59:00')
ON DUPLICATE KEY UPDATE name = VALUES(name);
